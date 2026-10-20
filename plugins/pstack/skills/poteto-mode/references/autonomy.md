# Autonomy on Claude Code and Codex

This contract applies only to Claude Code and Codex. It takes precedence over the inherited operator-only merge, owner-count approval, and fix-forward ceiling clauses in [Autopilot-full](../playbooks/autopilot-full.md), including that playbook's opening summary and reply. All its other steps still apply. Other harnesses retain their inherited behavior.

## Authorization comes from the user

Choosing a workflow or routing setting never grants permission to merge. Read the current user and repository instructions and the task's actual grant. A request to plan, fix a bug, prepare PRs, or work unattended does not by itself authorize landing them. A grant to build and merge a named queue covers only that queue and its stated destination. Preserve a request for joint review, an item reserved to the user, and any budget, approval, or repository gate. When merge authority is absent or unclear, keep working to merge-ready and ask only for the missing decision.

A stop or hold overrides an earlier grant immediately. Send a zero-writes order to every owner and verifier, cancel pending merge requests under [Merge and restack safety](merge-safety.md), confirm their actual state, and record what has already landed. Do not start another merge or replacement writer while the stop is taking effect. Resume only when the user releases the hold.

## Apply Autopilot-full with these changes

| Inherited step | Claude Code and Codex behavior |
| --- | --- |
| Step 1, program size | State the owner count and verification lanes before fan-out. Follow the user's concurrency, cost, and retry limits and the runtime's actual capacity. There is no additional three-owner approval or two-fix-forward ceiling on Claude Code and Codex unless the user or repository sets it. |
| Step 2, owner handoff | One owner carries a PR through build, proof, and an authorized merge. With a review-before-merge instruction or no landing authority, the owner stops at merge-ready. |
| Step 4, fix-forwards | Keep the independent verification, live lane, diff-scoped findings, and single-writer rule. Continue fix-forwards within the grant and its limits; a repeated failure without progress calls for a new approach or a blocked report, never a weaker gate. |
| Step 5, merge | After the root's independent verdict is clean, the owner may merge if the current grant covers it and every gate below passes. Use the revision-safe merge and readback procedure in [Shipping](../playbooks/shipping.md), including repository and destination checks. No extra operator click is required by pstack. |
| Reply | Report what actually merged, what is merge-ready, and what remains blocked, with PR links and evidence. |

Before an owner merges, require the root's independent verdict, the live proof required by the playbook, checks for the current head and destination, and all repository approvals and branch rules. A verdict must still apply to the code that will land. Re-run affected checks after a head or base change; use Shipping's patch-id rule only where its applicability is established. Never bypass protections or substitute a local countersign for a forge-required approval. If a required service-side revision guard or approval is unavailable, stop at merge-ready and report that limitation.

No setting, grant, test run, or CI result substitutes for a required independent reviewer or live proof. If either cannot run, record the missing evidence and keep the merge gate closed. The [Subagents rules](../SKILL.md#subagents) still apply, including confirmed stops before replacing a writer. Autopilot-stack still hands its stack to the operator; these full-autopilot changes do not authorize landing a stack.

## Optional preferences use native instructions

For persistent preferences, use the instruction file the harness already loads: `CLAUDE.md` on Claude Code and `AGENTS.md` on Codex, at the user's chosen project or user scope. Do not write them merely because this reference was loaded. Instructions such as "Prepare PRs, but wait for my review before every merge", "Use at most three concurrent owners", or "Stop after two fix-forward rounds per PR" select the corresponding limits without a new profile or configuration file. They restrict work; they do not grant new authority.

Before an authorized edit to an instruction file, inspect whether its path or parent is a symlink. If Claude and Codex instruction paths resolve to one shared file, edit it once and preserve its contents. Use common wording there; put runtime-specific choices in their own native configuration. A task-specific gate or stop remains effective even when a persistent preference allows more autonomy.

## Routing is separate from merge authority

The inherited `session hook: on` or `session hook: off` line in the current runtime's model sheet controls the SessionStart mandate. [Setup](../../setup-pstack/SKILL.md#other-runtimes) names the native paths and the setup step that asks for this choice. Missing or unreadable settings retain the inherited default, on. Off removes the mandate; skills remain installed and available, so it is not a runtime-enforced ban on implicit skill selection. The setting survives new sessions because the native hook reads the sheet again; Codex must also trust the hook.

Changing routing does not alter the task's grant, remove a review gate, or create missing proof. Explicit user and repository instructions retain precedence whether the hook is on or off.
