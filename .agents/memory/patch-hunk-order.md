---
name: Patch hunk ordering
description: How the workspace patch tool handles multiple update hunks for one file.
---

For a multi-hunk update to one file, `functions.apply_patch` requires hunks to match in top-to-bottom file order. It rejects an out-of-order patch without applying the changes.

**Why:** Repeated UI edits failed when import and component hunks were supplied in a different order than their positions in the file.

**How to apply:** Sort hunks by file position before submitting, or apply small, independent changes in separate calls.
