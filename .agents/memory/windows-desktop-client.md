---
name: Windows desktop client
description: How the standalone Windows executable relates to the Max Chill VPS website.
---

The staff-facing Windows application is distributed as a standalone `.exe`, not only as a browser tab.

**Why:** The user confirmed the old interface screenshot came from opening a separate `.exe`.

**How to apply:** Treat website deployment and Windows executable updates as separate release paths. Verify how the executable was packaged before suggesting exact rebuild or cache-refresh steps.
