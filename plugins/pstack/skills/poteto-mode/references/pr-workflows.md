# PR workflows on Claude Code and Codex

Apply this reference only on Claude Code and Codex to PR creation, Babysit, both autopilots and Shipping. Keep their inherited lifecycle and proof requirements and [merge/restack guards](merge-safety.md). Other harnesses retain inherited procedures.

## Resolve native paths and tools

Identify the enabled installed plugin, target worktree, repository and destination. Use installed absolute helper paths under the [delegation rules](delegation.md); resolve project checks and the [live driver](verification.md) from the target checkout. A writable checkout does not necessarily grant writes to its shared Git directory; use native permissions for the affected operation.

Choose the actual forge once and carry its repository explicitly through calls. GitHub helpers operate on GitHub. Origin remains optional and must provide equivalent service-side revision guards and pending-request inspection/cancellation before it can land work; otherwise stop at merge-ready.

## Preserve native process state

Use Claude Code's exposed shell/background tools or Codex's shell transport, which may be inside `functions.exec`. Retain the full result containing the process/session handle and poll with its matching tool to a terminal result. A yielded call is still running; do not start duplicate watchers.

Use the inherited watcher for bounded foreground checks. `--status-only` exit 0 means status was read, not that CI passed. A retained shell session is not durable unattended scheduling; report unavailable scheduling and leave a checkpoint.

## Resume and stop

After interruption inspect actual PR, destination and pending requests before retrying a write. Reconcile worker/process ownership separately. If landing already happened, confirm its final revision and destination content before advancing.

A user stop requires stopping owned local tasks and cancelling remote pending merges under the existing safety procedure. Interrupting a local process alone does not cancel auto-merge or queue membership. Keep the task's existing trail of PR URLs, revisions, reviewer identities, helper results and confirmed landing; no additional receipt service is required.
