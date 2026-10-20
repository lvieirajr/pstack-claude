# Autonomy on Claude Code and Codex

Apply this reference only on Claude Code and Codex. It overrides the operator-only merge, owner-count approval and fix-forward ceiling clauses in [Autopilot-full](../playbooks/autopilot-full.md), including its summary and reply. Keep every other step and gate. Other harnesses retain the inherited behavior.

## Authorization comes from the user

Choosing a workflow or routing setting never grants permission to merge. Follow the current user grant and repository instructions, including joint review, reserved items, budgets and stops. Without landing authority, work to merge-ready and ask only for the missing decision.

A stop or hold overrides an earlier grant immediately. Stop owned tasks, cancel pending requests and read back remote state using [Merge and restack safety](merge-safety.md). Report completed writes before resuming under a new grant.

## Apply Autopilot-full with these changes

There is no additional three-owner approval or two-fix-forward ceiling on Claude Code and Codex unless the user or repository sets it. State the owner count and verification lanes before dispatch and respect native capacity. Keep independent verification and the single-writer rule during fix-forwards.

An authorized owner may merge its named PR after the root's independent verdict and all required live proof, current checks and repository approvals. Use [Shipping](../playbooks/shipping.md) for revision guards, changed-base proof and destination readback. Preserve joint-review gates; missing proof or service-side guards stops work at merge-ready. Report actual merged, ready and blocked outcomes. Autopilot-stack still stops for the operator.

## Optional preferences use native instructions

Store user-requested persistent preferences in the native `CLAUDE.md` or `AGENTS.md`, at their chosen scope. Do not write preferences merely because this reference was loaded. Inspect symlinks before editing; edit a shared target once and preserve existing contents. Review-before-merge, concurrency and retry limits restrict the task's grant.

## Routing is separate from merge authority

The existing `session hook: on|off` line controls the SessionStart mandate; [Setup](../../setup-pstack/SKILL.md#other-runtimes) names its paths. Missing settings default to on. Off leaves skills available for explicit or implicit selection. Codex must trust the hook. Routing never changes authorization or review requirements.
