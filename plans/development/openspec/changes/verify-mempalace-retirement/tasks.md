## 1. Release the work under test

Nothing below is meaningful until the artifact exists. Verifying a working tree
proves something about the wrong thing.

- [ ] 1.1 Push `feat/bench-pairwise-champion` and open its PR
- [ ] 1.2 Human merge, then confirm the release tag exists for the bumped
      version (`0.8.24`) — the Tag release workflow cuts it when the version
      changes
- [ ] 1.3 **Gate:** the marketplace serves the released version — proves nothing
      yet, but every task below is void without it

## 2. Install the published artifact, and prove it is the published one

- [ ] 2.1 Install huhhb from the marketplace into a **clean profile**. Do not
      hand-assemble a cache; the point is to exercise what a user receives
- [ ] 2.2 Read the installed version back and match it against `0.8.24` before
      checking anything. This repo's tooling makes a wrong install easy and
      quiet: `plugin install` reports success and does nothing, `plugin update`
      reads a stale catalog, and `marketplace update` resets the clone to `main`
      and deletes the branch under test — which self-reverted once already
- [ ] 2.3 If the versions do not match, **stop and record the run as void**. Do
      not keep findings with a caveat
- [ ] 2.4 **Gate:** installed version equals the expected release — proves *The
      installed artifact is confirmed before anything is checked* and *A stale or
      reverted install voids the run*

## 3. Check the four deferred scenarios

- [ ] 3.1 **Absent from a fresh install** — start a session and confirm no
      `memory` MCP server is registered and no tool call fails. Note that a
      standalone MemPalace plugin registers its own server as `mempalace`; that
      one being present is correct and is not this check failing
- [ ] 3.2 **Fails legibly** — invoke **each of the four** skills (`memory`,
      `memory-search`, `memory-mine`, `memory-status`) with no server
      configured, and record each result. The change rewrote four distinct
      prerequisite surfaces; one skill answering correctly says nothing about
      the other three. Confirm the user meets the stated prerequisite and the
      pointer to `skills/memory/reference.md`, not an unexplained missing tool
- [ ] 3.3 **Current phrasing routes to the current system** — issue "remember
      this", "what do we know about X", "search my memory" and "memory status".
      For each, record **both halves**: the current owner expected to answer it
      and whether it actually activated, then separately that no retired skill
      claimed it. Checking only the negative half passes when a phrasing
      activates *nothing*, which is a routing hole wearing a clean result.
      Record the `.claude/skills/` contamination caveat with any figure;
      installing does not fix that
- [ ] 3.4 **Reachable by name** — name MemPalace explicitly and confirm **each
      of the four** retired skills can still be reached, recording each.
      Retirement removes a skill from routing, not from reach; this is the half
      that proves the first half did not overshoot, and it has to hold for all
      four or the overshoot is simply somewhere unmeasured
- [ ] 3.5 **Gate:** all four scenarios exercised against the published artifact
      across all four skills, each recorded as verified or still-partial with a
      reason

## 4. Write the result back

- [ ] 4.0 **Confirm where `retire-mempalace` lives before writing to it.** It is
      **active** at `plans/development/openspec/changes/retire-mempalace/` as of
      this change being written, not archived. Archive it first (`/opsx:archive`,
      which dates the directory), then write to
      `plans/development/openspec/changes/archive/YYYY-MM-DD-retire-mempalace/`.
      Writing to the archived path before the archive exists silently creates a
      second copy of the change
- [ ] 4.1 Update that change's scenario coverage table with the live results.
      This is the one sanctioned write into an archive — the archive records
      what was proven, and the proof arrived late
- [ ] 4.2 A scenario that still cannot be checked keeps its partial status and
      gains a stated reason. Do not drop it
- [ ] 4.3 **Gate:** no scenario in `retire-mempalace` reads "partial" without a
      reason — proves *Coverage stops reading partial once proven* and *A
      still-unverifiable scenario keeps its status and gains a reason*

## 5. Handle anything the checks contradict

- [ ] 5.1 Any check that contradicts a requirement is raised as a **defect
      against `retire-mempalace`**, not filed as an observation. The change
      asserted behaviour the system does not have
- [ ] 5.2 Fix it in **its own change**. A verification pass that edits skills or
      the manifest has become an unreviewed edit wearing a verification label
- [ ] 5.3 **Gate:** every contradiction has a defect record and none was fixed
      inside this change — proves *A contradicted requirement produces a defect,
      not a footnote* and *Verification does not quietly fix what it finds*

## 6. Close out

- [ ] 6.1 Record the working install procedure where the next post-release check
      will find it — the mechanics are hostile enough that rediscovering them
      costs more than writing them down
- [ ] 6.2 Note which adjacent gates the same install could have closed:
      `skill-authoring-standard`'s live bench and its `3.6` reload check. Doing
      them in the same sitting is sensible; folding them in here is not, because
      a bench run costs real money and this does not
- [ ] 6.3 **Gate:** `openspec validate --all --store huhhb` green
