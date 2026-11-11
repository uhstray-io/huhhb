# Plane work tracking

author: Joseph A. Wisneski IV

## 1. What this is

Uhstray.io tracks work in Plane, a self-hosted project tracker that replaced tududi. Plane syncs both ways with GitHub issues and pull requests. This document sets out how we use Plane when Claude Code works on one of our repositories: which fields an item carries, how labels, modules and milestones are named, how an item moves through its states, and how time is logged. The `plane-work-tracking` skill holds the step-by-step runbook that Claude Code follows (`SKILL.md`, beside this file). This README is the reference a teammate can read without it.

## 2. Setup

1. Install the huhhb plugin. The [huhhb README](../../README.md#install) gives the install commands.
2. In Claude Code, run `/plane-work-tracking` and ask it to set up Plane work tracking. It shows each change for your approval, then does two things:
   - It writes a block into `~/.claude/CLAUDE.md`, between BEGIN and END markers, so every session knows the convention. The block also repeats the PR-title rule from section 9, so agents that open pull requests without loading the skill still follow it.
   - It creates the opt-in marker file `~/.claude/plane-tracking.on`. The session hook stays silent until this marker exists or the environment variable `HUHHB_PLANE` is set to `1`, `true`, `on` or `yes`.
3. Check that the Plane connection works. Run `claude mcp list` and confirm that `plane` shows as connected.

The full setup steps are in the Setup section of [SKILL.md](SKILL.md).

## 3. Core rules

- **Work one item at a time.** Claim one work item, finish it or close it out, and only then claim the next one.
- **Update the item before you move on.** Close-out is part of the work. The time log, the outcome comment and the state come before any other item.
- **Create work items in Plane, not as GitHub issues.** Plane is the only tracker for new work. GitHub issues reach Plane only when labelled `plane` (section 9).
- **Pull requests are still created on GitHub.** Plane follows them once they are open.
- **No bulk backfill.** Existing items are conformed to this convention when a session touches them. Nobody sweeps the backlog in one pass.
- **Priority is never `none` on an item a session touches.** See section 6.

## 4. Every work item carries

| Field | What to set | Where it is described |
|---|---|---|
| Assignee | The person doing the work. When Claude Code claims an item, it assigns the Plane user it is signed in as. | Section 3 |
| Priority | One of the four levels in the rubric. Never `none`. | Section 6 |
| Type label | Exactly one type label. | Section 5 |
| Area label | One or more area labels for the product the item belongs to. | Section 5 |
| Module | The module the work belongs to. | Section 7 |
| Milestone | The release the work ships in. | Section 8 |
| Relations | Dependencies and links to other items. | Section 12 |
| Parent | Set only on a sub-item created for work found mid-item. | Section 11 |
| Time log | Elapsed minutes logged when the session leaves the item. | Section 10 |

## 5. Labels

Labels come in two layers.

**Type labels** say what kind of change an item is. Every item gets exactly one. We reuse the names of GitHub's existing labels where they fit.

| Label | Use it for |
|---|---|
| `bug` | Something is broken or does not behave as designed. |
| `enhancement` | A new feature or an improvement to existing behaviour. |
| `documentation` | Documentation changes only. |
| `refactor` | Restructuring code without changing its behaviour. |
| `chore` | Maintenance that is neither a feature nor a fix. |
| `test` | Adding or fixing tests only. |
| `ci` | Changes to continuous integration. |
| `security` | A security fix or hardening change. |
| `dependencies` | Updating a dependency. |

The shared type labels are declared in `platform/services/plane/schema.yml` in the agent-cloud repository. They are declared under `labels:` only. They are not listed under `item_labels`, because each session picks a type for each item. They reach Plane after the `dev` branch is promoted to `main` and the sync runs. Until then, a session that needs a missing type label creates it in Plane under the same name, and the sync adopts it by name.

**Area labels** say which product an item belongs to. They are created per project, and they reuse the names of that repository's existing GitHub labels. An item can carry more than one.

| Project | Area labels |
|---|---|
| agent-cloud | `platform`, `playbooks`, `semaphore`, `netbox`, `go` |
| zerds | `rust`, `github_actions`, `batch-1-polish`, `batch-2-bug`, `batch-3-feature`, `needs-owner`, `needs-windows` |
| huhhb | `skills` |

A new area is proposed to the owner, confirmed, and then created with the same name as its GitHub label. Label names are permanent. The sync matches labels by name and never deletes them, so choose a name you can live with.

## 6. Priority rubric

| Priority | Meaning |
|---|---|
| `urgent` | Production is down, or there is a security or data-loss problem. |
| `high` | The item blocks another open item (it has `blocking` relations), or it sits on the milestone's critical path. |
| `medium` | The default for planned work in the current milestone. |
| `low` | Nice to have, or planned for a later milestone. |

`none` is never left on an item that a session touches.

## 7. Modules and worktrees

**Modules.** In a repository that uses OpenSpec, a module is an OpenSpec change. The sync creates these modules, so you do not create them by hand. In repositories that do not use OpenSpec (zerds, today), a module is one feature or one plan phase. A session creates it through the Plane MCP server after the owner confirms the name.

**Binding a worktree to a module.** Each worktree works on one module. The binding lives in git config on the worktree's branch, so it travels with the worktree and is never committed:

```sh
git config branch.<branch>.planeProject <project-id>
git config branch.<branch>.planeModule <module-id>
```

The session hook reads these keys at session start and tells the session which module the branch is bound to. If the branch has no module, the hook says so, and the session asks which module to use before it claims any tracked work. The session then records the answer with the two commands above.

**Working through a module.** Open items in the bound module are picked in this order:

1. Items with no open `blocked_by` relation come first.
2. Among those, work follows the OpenSpec task number order.
3. If every open item is blocked, the session stops and asks. It never starts a blocked item.

A branch holds one claim at a time. A session that finds a claim already recorded on its branch, left by another session or an earlier one, never overwrites it. At close-out a session clears only its own claim.

Before you write a filter for Plane, check the query syntax with the `get_pql_reference` tool of the Plane MCP server.

## 8. Milestones are releases

- A milestone's title is the exact tag the work ships in, for example `v0.15.0`.
- Its `target_date` is the planned cut date for that release.
- Prereleases tagged `-dev.N` are not milestones.
- agent-cloud tags releases as `vX.Y.Z`, with `-dev.N` prereleases. zerds tags releases as `vX.Y.Z`. Neither repository uses GitHub milestones.
- Plane's Releases feature is not available on our plan (the API returns HTTP 402). Milestones stand in for releases until that changes.
- When no existing milestone fits the work, the session proposes the next version, based on the latest tag. The repository owner confirms the version before the milestone is created.

## 9. Lifecycle and GitHub mapping

**Pickup.** Claiming an item moves it to In Progress.

**After a pull request opens, Plane owns the state.** Plane's GitHub integration moves the item as the pull request moves. Do not fight it by setting the state back by hand. The mapping for pull requests is:

| GitHub pull request state | Plane state |
|---|---|
| Draft Open | Backlog |
| Open | Todo |
| Review Requested | In Progress |
| Ready to Merge | In Progress |
| Merged | Done |
| Closed | Cancelled |

The mapping for issues is:

| GitHub issue state | Plane state |
|---|---|
| Open | Todo |
| Closed | Done |

**Issue sync is label-gated in both directions** ([docs.plane.so/integrations/github](https://docs.plane.so/integrations/github)):

- **Plane to GitHub: we don't use it.** Plane is the only tracker for new work. A Plane item becomes a GitHub issue only if it carries the `github` label, and we never add that label.
- **GitHub to Plane: label the issue `plane`.** A GitHub issue reaches Plane only when it carries the `plane` label. When a session meets an open GitHub issue that has no Plane item, it handles that one issue:
  1. It creates the `plane` label in the repository if the label is missing.
  2. It adds the label to the issue.
  3. It conforms the resulting Plane item like any other.
  
  Sessions never label the backlog in bulk.

A side effect is expected. Opening a pull request moves the item to Todo, or to Backlog for a draft. If you see that after a pull request opens, the mapping is working as intended.

The mapping is set per project in Plane's admin screens, and the Plane API does not expose it. The tables above record the intended configuration. If an item's state does not follow the table after a pull request, tell the repository owner.

**Pull request titles.** A pull request title carries exactly one work item ID in square brackets, at the end of the summary. For example, `feat(plane): add work-tracking skill [AC-123]`. The bracketed form links the item and runs the state mapping above. A bare ID, such as `AC-123` with no brackets, only creates the link. Other items that the pull request relates to appear as bare IDs in the body. Plane's documentation of these formats is at [docs.plane.so/integrations/github#reference-formats](https://docs.plane.so/integrations/github#reference-formats).

**Close-out states.** A session sets the state by hand only where automation does not own it: Cancelled, or Done when the work has no pull request.

## 10. Time tracking

Time is wall clock. The session records the start time when it claims an item, and it logs the elapsed minutes when it leaves the item. Plane's work log takes a duration in minutes, not a start and end time, so the start time is kept in git config until close-out. Time tracking is a per-project setting in Plane. If it is off, the work log is refused, so the session turns it on for that project and logs the time.

If a session finds a claim left open by an earlier session, it first logs that earlier stretch.

- It proposes the branch's last commit time as the end of that stretch, rather than the present, so overnight idle time does not count as work. You confirm it.
- If the last commit is older than the claim, or work continued after it, the session asks you for the end time or an estimate.

It then restarts the clock and either carries on with the item or closes it out.

## 11. New work found mid-item

When work turns up in the middle of an item, create a sub-item for it:

1. Create the work item in Plane.
2. Set its parent to the item you are working on.
3. Give it the same module as the parent, and the same milestone. If the parent's release has already shipped, use the next open milestone instead; the session proposes it and the owner confirms before it is created.
4. Conform it like any other item: priority, type and area labels, relations.

Edit the OpenSpec change's `tasks.md` only when the plan's scope changes. The sync reads OpenSpec changes from the default branch only. Adding discovered work to `tasks.md` on a feature branch would create a second copy of an item that already exists as a sub-item.

## 12. Relations

Use relations to record dependencies and links between items.

| Relation | Use it when |
|---|---|
| `blocked_by` | This item cannot start until the other item is done. |
| `blocking` | The other item cannot start until this item is done. |
| Relates to | The items are connected, with no ordering between them. |
| Implements | This item carries out the work described by the other item. |
| Duplicate | The same work already exists under another item. |

Dependencies use `blocked_by` and `blocking`. The `high` priority in section 6 is set from `blocking` relations. Plane's documentation does not make the direction of `blocked_by` entirely clear. Check it on the first relation you create. If Plane shows the relation the other way round, correct this section.

## 13. Close-out checklist

Before you move to any other item, and before any branch or worktree cleanup, work through this list.

- [ ] Log the elapsed minutes as a work log entry, with a one-line description.
- [ ] Comment on the item with the outcome and the pull request link.
- [ ] Set the state only where automation does not own it (Cancelled, or Done with no pull request).
- [ ] Bring the relations up to date.
- [ ] Read the item back and check every field in section 4.
- [ ] Clear `planeItem` and `planeItemStart` from the branch's git config.

Run this checklist before any branch or worktree cleanup. `git branch -d` deletes the branch's `branch.<b>.*` config, start time included, so close-out must come first.

If a session ends before close-out, the next session start shows an open claim and asks you to finish it before you claim anything new.

## 14. Opting out

1. Delete the marker file `~/.claude/plane-tracking.on`. The session hook then stays silent.
2. Unset `HUHHB_PLANE` if you set it.
3. Remove the block between the BEGIN and END markers in `~/.claude/CLAUDE.md`.
4. Optionally, remove the branch keys with `git config --unset branch.<branch>.planeProject` and the matching `planeModule`, `planeItem` and `planeItemStart` keys. The hook ignores them while it is off.

The session hook is [hooks/plane-binding.sh](../../hooks/plane-binding.sh).
