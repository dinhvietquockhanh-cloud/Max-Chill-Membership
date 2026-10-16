---
name: GitHub push authentication
description: Recovery guidance for GitHub pushes when the Replit OAuth connection is stale.
---

When Git operations against GitHub return 401 even though the Replit GitHub integration appears active, treat the OAuth authorization as stale. Repeated `git push` attempts or rebinding the same connection may not repair it; ask the user to disconnect and reconnect GitHub through the workspace Integrations or Git pane. Never request a personal access token in chat.

**Why:** The GitHub remote rejected the current authorization, while the Agent's reconnect flow could not proceed because the connection was marked disconnected.

**How to apply:** Before retrying a push, have the user restore the GitHub connection in the Replit workspace. Then verify access with a read-only remote check and push the already prepared commit.
