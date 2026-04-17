---
name: uhh-memory-status
description: Show uhh:memory palace statistics — drawer count, wings, rooms.
triggers:
  - memory status
  - palace stats
  - how much is in memory
  - what wings exist
---

# uhh:memory-status

Show palace statistics and structure.

## How to Use
Call `uhh_status` for totals.
Call `uhh_list_wings` for wing list.
Call `uhh_list_rooms` with a wing for room breakdown.

Present results as a compact summary:
- Total drawers
- Wings list with drawer counts per wing
- Oldest and newest content timestamps if available
