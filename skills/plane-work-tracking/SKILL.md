---
name: plane-work-tracking
description: Use when starting, picking up, finishing, or switching Plane work items in a repo that has a Plane project; when new work is discovered mid-task and must be tracked; when a session needs to know which Plane module its worktree works on; or when setting up Plane work tracking in a Claude config. Not for driving an open PR to merge — use pr-shepherd for that.
---

# Plane work tracking

Plane is where work is tracked; GitHub issues and PRs sync with it both ways. A session works
**one Plane work item at a time** and leaves each item complete and current before it touches the
next. Nothing is backfilled in bulk: an item is brought up to standard when a session works it.

Conventions for humans (why each rule exists) are in `README.md` beside this file. Read it only
when a teammate asks why a convention exists.

## Setup (once per machine)

Run when asked to "set up Plane work tracking". Show every change before writing it.

- [ ] `claude mcp list` shows `plane` connected. If not, stop: the Plane MCP server must be added first.
- [ ] `member me` (Plane MCP) returns your user. Never hard-code a member id; resolve it per session.
- [ ] Back up `~/.claude/CLAUDE.md`, then add the block below between its own markers. Replace an
      existing copy of the block; never touch the rest of the file. Show the diff, write on approval.
- [ ] `touch ~/.claude/plane-tracking.on` — turns on the huhhb SessionStart hook that reports the
      worktree's binding and any open claim.

```markdown
# >>> PLANE WORK TRACKING (BEGIN — delete this whole block to revert) >>>
In a repo with a Plane project, track work with the plane-work-tracking skill: load it before
claiming, creating or finishing a Plane work item. One item at a time; close an item out before
touching the next. Create new work as Plane work items, not GitHub issues. Every PR title carries
exactly one bracketed Plane identifier, e.g. `feat(dns): handle AAAA [AC-123]`; mention other
items without brackets. A brief to any agent that may open a PR includes that identifier.
# <<< PLANE WORK TRACKING (END) <<<
```

## The worktree binding

A worktree works one Plane **module**. The binding lives in git config on the branch (never committed):

| Key | Value |
|---|---|
| `branch.<b>.planeProject` | project UUID (`project list`, match `identifier`) |
| `branch.<b>.planeModule` | module UUID |
| `branch.<b>.planeItem` | claimed item identifier, e.g. `AC-612` |
| `branch.<b>.planeItemStart` | epoch seconds of the claim (`date +%s`) |

Unbound branch: propose a module and confirm with the user before recording it. In a repo synced
from OpenSpec, the module is the OpenSpec change (module name = change directory name). Elsewhere,
one module per feature or plan phase — create it only after the user confirms the name.

## The per-item loop

Copy this checklist for every item.

- [ ] **Pick.** Open items of the bound module (`module list_workitems`). First those with no
      unresolved `blocked_by` relation (`workitem_relation list`), then OpenSpec task-number order
      (`1.2` before `1.10`). Read `get_pql_reference` before writing a PQL filter.
- [ ] **Claim.** `workitem manage_assignee` adds `member me`; `workitem update` sets state
      **In Progress**; `git config branch.<b>.planeItem <ID>` and `planeItemStart $(date +%s)`.
- [ ] **Conform this item** (this item only — never sweep the module):
  - priority from the rubric below — never leave `none`;
  - exactly one **type** label and one or more **area** labels (`workitem manage_label`);
  - module membership (`module manage_workitems`) and milestone membership (`milestone manage_workitems`);
  - dependencies: `blocked_by`/`blocking` via `relation_type`; related work via the custom
    definitions *Relates to* / *Implements* / *Duplicate* (`list_definitions` for ids).
- [ ] **Work.** New work found mid-item becomes a **sub-item**: `workitem create` with `parent` = the
      current item, same module and milestone, conformed like any item. This holds **even when the
      new work is outside the current item's scope**: `parent` records where the work was found, not
      that the parent owns it, and the parent's close-out does not wait for it. Never a GitHub issue, and
      never a new line in OpenSpec `tasks.md` — the sync reads only the default branch and would
      create a duplicate later. Edit `tasks.md` only when the plan's scope itself changes.
- [ ] **PR.** Title `type(scope): summary [ID]` — the brackets make Plane link the PR *and* move the
      item's state by the project's PR mapping. Other items: bare `ID` (link only).
- [ ] **Close out** before claiming anything else, and before any branch or worktree cleanup
      (`git branch -d` deletes the binding and the start time):
  1. `work_log create`, `duration` = minutes since `planeItemStart`, one-line `description`.
  2. `workitem_comment` with the outcome; `workitem_link create` with the PR URL.
  3. State: if a PR carries `[ID]`, leave it — the PR mapping owns it from then on. Set it yourself
     only with no PR: Done (finished) or Cancelled (dropped).
  4. Update relations the work changed (unblocked items, newly found dependencies).
  5. Read back: `workitem retrieve` (assignee, priority, labels, parent), `module list_workitems`
     and `milestone list_workitems` contain it, `workitem_relation list`, `work_log list`.
     Fix anything missing and read back again.
  6. `git config --unset branch.<b>.planeItem` and `--unset branch.<b>.planeItemStart`.

**Resumed claim** (the SessionStart hook reports an OPEN CLAIM from an earlier session): first log
that earlier segment, measured from `planeItemStart` to the branch's last commit
(`git log -1 --format=%ct`) — not to now, which would count idle time — then reset
`planeItemStart` to now and continue, or close out.

## Rubrics

| Priority | When |
|---|---|
| `urgent` | production down, security issue, data loss |
| `high` | blocks another open item, or on the milestone's critical path |
| `medium` | planned work in the current milestone (default) |
| `low` | nice to have, or belongs to a later milestone |

**Type labels** (one): `bug`, `enhancement`, `documentation`, `refactor`, `chore`, `test`, `ci`,
`security`, `dependencies`. **Area labels**: the repo's own GitHub label names, per project. A
missing label is created with exactly the GitHub name (`label create`); propose a brand-new area
label to the user first. Label and state names are permanent keys — never rename one.

**Milestone = release.** Title is the exact tag the work ships in (`v0.15.0`); `-dev.N`
prereleases are not milestones. No milestone fits → propose the next version from the latest tag
(`gh release list`) and **ask before creating it**.

## Gotchas

- `module`/`milestone manage_workitems` return `null` on success and there is no module or
  milestone field on `workitem update` — membership is only provable with `list_workitems`.
- Plane Releases return HTTP 402 on our plan; milestones stand in for releases.
- The OpenSpec sync owns which items and modules exist (keyed by `external_id`); Plane owns state,
  assignees, labels and edits. Never delete or rename a synced item or renumber a task.
- Git stores `planeItem` keys lowercased; `git config --get` matches them case-insensitively.
- A relation's direction is not documented: after `workitem_relation create`, `list` it and
  confirm it reads the way you meant; fix by deleting with the same `is_dependency` kind.

## Red flags — stop

| Thought | Reality |
|---|---|
| "I'll log the time at the end of the day" | The start is in git config only until the branch is cleaned up. Log at close-out. |
| "The PR is open, I'll set the item to In Review/Done" | The bracketed PR owns the state. Setting it fights the automation. |
| "Quick follow-up, I'll open a GitHub issue" | New work is a Plane sub-item with `parent` set. |
| "It's not part of this item, so no parent" | Found while working this item → sub-item of it. Scope doesn't change that. |
| "While I'm here, let me fix every item in the module" | One item at a time. Conform only the item you claimed. |
| "No milestone fits, I'll create v0.16.0" | Propose and ask. Release scope is the owner's call. |
| "The update call succeeded, so it's set" | `manage_workitems` returns nothing. Read back. |
