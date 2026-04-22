---
name: onboarding
description: Use when setting up Claude Code for the first time, configuring auto mode, enabling agent teams, or when user says "set up Claude", "configure my assistant", "onboard me", or "enable auto mode"
---

# Onboarding

Walk the user through configuring Claude Code with Auto Mode and Agent Teams. Complete each phase in order.

## Phase 1: Check Current State

Read `~/.claude/settings.json`.

If the file contains both `permissions.defaultMode: "auto"` AND `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"`, say:

> "It looks like you're already onboarded! Would you like to undo the current Auto Mode and Agent Teams settings?"

- **Yes** → Remove `permissions.defaultMode`, `permissions.allow`, `permissions.deny`, `permissions.ask`, `autoMode`, and `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` from `~/.claude/settings.json`. Confirm:
  > "Done. Auto Mode and Agent Teams settings have been removed. Restart Claude Code for changes to take effect."
  Then stop.
- **No** → Stop without changes.

If the file does NOT contain both keys, proceed through all phases below.

## Phase 2: Auto Mode Setup

Say:

> "Auto Mode lets Claude act autonomously within a configurable permission boundary. A background safety classifier evaluates every tool call — your permission rules define what Claude can do without prompting you."

Then ask:

> "To tune the auto mode classifier for your environment, describe your organization — for example: your company name, cloud providers, trusted domains, or any services Claude should know about. You can keep this brief or skip it."

Wait for a response or skip confirmation.

Next, display the default permissions and ask:

> "Here are the default permissions I'll configure. Is there anything you'd like to add or remove before we apply them?"
>
> **Allow** (no prompt needed):
> `Bash(git status)`, `Bash(git diff *)`, `Bash(git log *)`, `Bash(git show *)`,
> `Bash(git branch *)`, `Bash(* --version)`, `Bash(* --help *)`,
> `Bash(ansible-lint *)`, `Bash(yamllint *)`,
> `Bash(ansible-playbook --check *)`, `Bash(ansible-playbook --list-tasks *)`,
> `Bash(docker ps *)`, `Bash(docker images *)`, `Bash(docker inspect *)`,
> `Bash(podman ps *)`, `Bash(podman images *)`, `Bash(podman inspect *)`,
> `Bash(ls *)`, `Bash(find * -name *)`, `Bash(curl *)`, `Read`, `Glob`, `Grep`
>
> **Deny** (always blocked):
> `Bash(rm -rf /)`, `Bash(rm -rf ~)`
>
> **Ask** (prompt before running):
> `Bash(sudo *)`, `Bash(su *)`, `Bash(ssh *)`, `Bash(scp *)`, `Bash(sftp *)`,
> `Bash(rm -rf *)`, `Bash(wget *)`, `Read(~/.ssh/**)`, `Read(./.env)`,
> `Read(./.env.*)`, `Read(./secrets/**)`, `Read(**/*.key)`, `Read(**/*.pem)`,
> `Read(**/id_rsa)`, `Read(**/id_ed25519)`, `Bash(git push *)`, `Bash(git commit *)`,
> `Bash(ansible-playbook *)`, `Bash(docker run *)`, `Bash(docker exec *)`,
> `Bash(podman run *)`, `Bash(podman exec *)`,
> `Bash(docker compose *)`, `Bash(docker-compose *)`

Wait for a response. Apply any requested additions or removals to the lists.

Write to `~/.claude/settings.json` (merge with existing content, do not overwrite unrelated keys):

```json
{
  "permissions": {
    "defaultMode": "auto",
    "allow": [
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git show *)",
      "Bash(git branch *)",
      "Bash(* --version)",
      "Bash(* --help *)",
      "Bash(ansible-lint *)",
      "Bash(yamllint *)",
      "Bash(ansible-playbook --check *)",
      "Bash(ansible-playbook --list-tasks *)",
      "Bash(docker ps *)",
      "Bash(docker images *)",
      "Bash(docker inspect *)",
      "Bash(podman ps *)",
      "Bash(podman images *)",
      "Bash(podman inspect *)",
      "Bash(ls *)",
      "Bash(find * -name *)",
      "Bash(curl *)",
      "Read",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)"
    ],
    "ask": [
      "Bash(sudo *)",
      "Bash(su *)",
      "Bash(ssh *)",
      "Bash(scp *)",
      "Bash(sftp *)",
      "Bash(rm -rf *)",
      "Bash(wget *)",
      "Read(~/.ssh/**)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(**/*.key)",
      "Read(**/*.pem)",
      "Read(**/id_rsa)",
      "Read(**/id_ed25519)",
      "Bash(git push *)",
      "Bash(git commit *)",
      "Bash(ansible-playbook *)",
      "Bash(docker run *)",
      "Bash(docker exec *)",
      "Bash(podman run *)",
      "Bash(podman exec *)",
      "Bash(docker compose *)",
      "Bash(docker-compose *)"
    ]
  },
  "autoMode": {
    "environment": ["<user description — omit this entire autoMode block if user skipped the environment question>"]
  }
}
```

If the user skipped the environment question, omit the `autoMode` block entirely.

## Phase 3: Agent Teams Setup

Say:

> "Agent Teams is an experimental feature that allows Claude to spawn and coordinate multiple specialized sub-agents to work on complex tasks in parallel."

Write to `~/.claude/settings.json` (merge with existing `env` block if present):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## Phase 4: Summary

Count the actual allow, deny, and ask rules applied (including any user edits). Display:

> "You're all set! Here's what was configured in `~/.claude/settings.json`:"
> - ✅ Auto Mode enabled (`defaultMode: "auto"`)
> - ✅ Permissions configured ([X] allow, [Y] deny, [Z] ask rules)
> - ✅ Agent Teams enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
> - ✅ Environment context saved _(omit this line if user skipped the environment question)_
>
> "Restart Claude Code for all changes to take effect."
