# Native delegation on Claude Code and Codex

Apply this contract only on Claude Code and Codex. It takes precedence over inherited launch-all-at-once, `readonly`, stop, and restart instructions. Keep each skill's phases, briefs, required lanes, model policy, and independent verdicts. Other harnesses retain their inherited procedures. Use the host's exposed native tools; this contract adds no scheduler, daemon, or alternative agent launcher.

## Establish capabilities and identity

Before fan-out, inspect the current tool schema and permission policy, available concurrency, nesting, and model selectors. Configuration is a ceiling, not proof of remaining capacity or permission to delegate. A missing tool or capacity error is not a rejected model. Follow the [model selection contract](model-selection.md); never change models or effort to evade a capacity error.

Give every child the absolute path of the installed skill it needs, the task, scope, current instructions, exact input revision or snapshot, verification, and report shape. A writing child gets its own worktree and branch, based on the intended commit, plus separate writable artifacts. A different branch in one shared checkout does not isolate writers. Worktrees do not isolate ports, databases, browsers, or credentials; assign those resources when the task uses them.

Pin the enabled native plugin copy, not the newest cached directory or highest version. This fork intentionally keeps one version across development commits. Record the source commit when known, installed path, and content hashes of the entrypoint and required references. Have the child read those exact files and return their identity with its result. A missing path, stale copy, conflicting instructions, or missing required tool is `BLOCKED`, not permission to search unrelated caches. Apply the [history contract](history.md) to native run IDs, forked context, and launch boundaries. Inherited parent work never counts as the child's own actions.

A native task address can be a logical name or path rather than a persisted history UUID. Keep that address for lifecycle calls and obtain any separate history ID from supported native metadata, such as the exact task path's `subAgentActivity.agentThreadId` in Codex parent history. Before declaring a binding or export unavailable, follow the [history contract's adapter checks](history.md); catalog absence alone is not a failed export. If the host cannot bind or export the child history, retain its artifacts and identity but mark required child-tool audits or Eval criteria unverified. A parent transcript containing a receipt or summary is not the child's tool trace.

Children execute their assigned slice, not the whole parent playbook. If nested delegation is unavailable, relay the decomposition to the parent, which launches the workers or independent reviewers itself. Never satisfy a required second opinion by having the writer assume another persona. Flatten placement, preserve review separation.

## Native actions

Use only fields the active schema supports. Tool names and reply formats vary between host versions. Some Codex surfaces expose `collaboration` actions and run shell calls through `functions.exec`; others expose legacy tools directly. Use the offered transport and selector fields rather than copying an example call from another surface.

| Action | Claude Code | Codex |
| --- | --- | --- |
| Start | `Agent`, with the prescribed native agent type; background execution when available. | The exposed `spawn_agent`, possibly inside a tool namespace. Pass the installed skill path explicitly; Claude agent definitions do not register Codex types. |
| Collect | Preserve the returned agent/task ID and output pointer. Consume completion notifications and supported task-result tools; a notification is not proof every child process exited. | Preserve the exact agent/thread ID. Use native wait/status tools and retain the terminal result before closing. A wait timeout is not completion. |
| Message/follow-up | Use `SendMessage` or the current supported resume action for that exact ID. Messaging a finished worker can restart it. | Hosts may expose `send_input`, `send_message`, or `followup_task`. Read the schema: a message may only queue input, while a follow-up may start another turn. |
| Stop | `TaskStop` or the native task control, targeted to the returned task ID. Confirm the stopped run has exited and reconcile its background commands. | Use the exposed interrupt/stop/close actions and confirm their documented shutdown result. `close_agent` can return the previous state, not an exit acknowledgement. An interrupt can leave a resumable thread open. |
| Release capacity | Running counts can fall after exit; use the observed native task state. | Some hosts keep completed threads open until `close_agent`; others expose no close action. Confirm actual slot release, never invent it. |
| Nest | Inspect current nesting support and any configured depth limit. | Inspect the host's actual tools and limits; do not copy a depth setting from another Codex generation. |

Preserve Lauren's fresh-agent rule. New work and ordinary fix rounds use fresh agents with consolidated briefs. Reuse only when the existing agent owns costly state the work needs, or under the existing finished-independent-reviewer exception in [Subagents](../SKILL.md#subagents). Pass the full current brief and head/snapshot. The same reviewer identity counts once; another message is not another independent vote.

`readonly: true` is not a portable access-control field. On Claude Code, general-purpose `Agent` schemas may omit it; on Codex, permissions are inherited. Ask reviewers to make no edits and use supported tool restrictions where appropriate, while retaining the tools their task needs. Do not claim a prompt creates a sandbox. If actual read-only enforcement is required and unavailable, report the gap. A tool being present in the parent's catalog does not establish that it works in the child; surface denied or missing access in the report.

## Queue logical lanes within native capacity

Write every required lane into the existing todolist or orchestration store before spawning. Keep a stable lane ID, purpose, required model, input head/snapshot, child ID, output/evidence pointer, and state. Pending, running, passed, issues, blocked, and abandoned are distinct outcomes. An attempt or replacement belongs to its original lane, not a new coverage credit.

Launch a rolling window no larger than the actual available capacity and refill as results are collected and slots become available. Preserve required phase barriers: Arena's judge starts after all candidate writers finish. On the first capacity rejection, stop dispatching, retain successful launches, collect/release according to native semantics, and queue the rest. Never retry-spam or resume finished agents just to bypass the cap. Without a supported release path, record the remaining lanes as blocked.

Ten logical lanes still require all ten scenarios and attributable results when only two or three workers can run together. Queued waves change execution placement, not coverage or model diversity. A failed, missing, duplicate, or wrong-revision result cannot complete a lane. Retain valid results and retry only missing/invalid lanes under the skill's retry rule. A dropout can be reported with N-1 results where the skill allows it, but required coverage remains incomplete. Race selection follows the rule declared before launch; stopping the losers does not erase their ownership or evidence obligations.

## Completion, replacement, and recovery

A writer's final message and an interrupt request do not prove its worktree is safe to reuse. Record the native stop acknowledgement, known child/background commands, final diff/status and head, and saved partial output. Never delete or reassign a live writer's worktree. If native status or process inspection cannot establish quiescence, mark that ownership unresolved and keep dependent integration/cleanup blocked. A stable transcript timestamp or one clean `git status` is not liveness evidence. Independent work with separate ownership may continue.

Late results must match the lane's current attempt and revision before acceptance. Preserve useful partial findings, but do not let a replaced writer overwrite a newer result or turn abandonment into a pass. The parent reads the real diff/artifact and checks the reported verification, as the skill requires.

After interruption or session restart, load the existing checkpoint/store, briefs, lane outcomes, receipts, branches, and artifacts. Treat previously running workers as **unknown**, not automatically dead. Inspect native task/thread state without resuming it, and reconcile reachable workers and background processes. If they cannot be found or stopped reliably, quarantine their ownership and report the limitation. Spawn replacements only after resolving conflicting ownership; retain completed valid lanes rather than rerunning the whole panel. Use fresh briefs with all current instructions and exact source identity.

## Independent review and gates

Keep writer and reviewer run identities separate and bind the verdict to the actual head or captured uncommitted snapshot. A reviewer who wrote the change cannot independently approve it. Tests, CI, role labels, sequential self-review, and a scripted provider fixture do not supply an independent model verdict. Verify model diversity separately from worker count, using resolved model identities and any stronger different-family requirement in the calling workflow.

Keep each review's source identity, reviewer/run/model, input revision, verdict, and evidence. A changed input invalidates the old verdict. The parent synthesizes findings without auto-applying Interrogate's recommendations and without leaking Arena's judge rubric into candidate briefs. A required review that lacks eligible reviewers or required receipts is `BLOCKED: independent review`; exploration may use the inherited labelled sequential fallback. Continue work that does not depend on that gate, and keep dependent completion, merge-ready, and shipping closed.

## Native references

Inspect the active host rather than treating these documents as a universal tool schema. [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) describes tool filtering, configured limits, worktree isolation, messaging, and background children. [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) and the [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#agentsmax_concurrent_threads_per_session) describe native orchestration and configuration; managed hosts may expose a different subset. Do not alter the user's live configuration to make a test pass.
