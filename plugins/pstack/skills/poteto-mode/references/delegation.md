# Native delegation on Claude Code and Codex

Apply this reference only on Claude Code and Codex. It replaces inherited native dispatch, launch-all-at-once and `readonly` assumptions. Keep each skill's phases, briefs, model requirements and independent verdicts, including the [Subagents rules](../SKILL.md#subagents). Other harnesses retain their inherited procedures.

## Establish capabilities and identity

Inspect the active schema, permissions, concurrency and nesting before dispatch. Configured limits do not establish available slots. A capacity error is not a model rejection; keep the [selected model and effort](model-selection.md).

Give each child the task, scope, current instructions, exact input revision, verification and report shape. Pass the absolute paths of the enabled installed skill and references, with source commit or content hashes to distinguish copies. Do not select a cache by highest version or recency. Have the child read and identify those files; unavailable or stale sources block the affected lane.

Use the calling skill's worktree isolation for writers. Different branches in one shared checkout do not isolate writes; [verification resources](verification.md) need separate ownership too. If nesting is unavailable, relay decomposition to the parent without replacing an independent reviewer with the writer.

## Native actions

Use only exposed tools and fields; names and return shapes vary by host version.

| Action | Claude Code | Codex |
| --- | --- | --- |
| Start | `Agent` with the prescribed type and background execution when available. | Exposed `spawn_agent`; pass installed skill paths because Claude agent definitions do not register Codex types. |
| Collect | Keep the returned task/agent ID and output pointer; use native result/status tools. | Keep the exact lifecycle ID and terminal result. A wait timeout is not completion. |
| Follow up | Supported resume or `SendMessage` for that ID; messaging a finished worker may restart it. | Inspect `send_input`, `send_message` or `followup_task` semantics: queuing input and starting a turn differ. |
| Stop/release | Native task stop and confirmation of exit, including background commands. | Native interrupt/stop/close; check shutdown and actual capacity release. A returned previous state is not an exit acknowledgement. Some hosts expose no close action. |

Some Codex hosts namespace collaboration tools and route shell calls through `functions.exec`; use the offered transport. A lifecycle task path may differ from its persisted history UUID. Follow the [history reference](history.md) for the binding and export; a parent summary is not a child's tool trace.

`readonly: true` is not a portable access-control field. Request no edits and use supported restrictions without removing tools the reviewer needs. Prompt wording does not create a sandbox; report required enforcement or child tools that are unavailable.

## Queue and recover required lanes

Track required lane, input revision, attempt, child ID, outcome and evidence in the existing todolist/store. Launch a rolling window within available capacity, collecting and releasing before refilling. On capacity rejection retain successful starts and queue the rest. Preserve phase barriers and all required scenarios and model diversity; fewer concurrent workers does not reduce coverage.

Apply the inherited fresh-agent and reviewer-reuse rules. A repeated reviewer counts once. Accept only results matching the current lane attempt and revision. Retain valid results and retry missing lanes under the skill's rules.

Before replacing a writer or reusing its worktree, confirm native exit and reconcile background commands and partial changes. After restart treat previously running workers as unknown until inspected without resuming them. Unresolved ownership blocks replacement and cleanup of its resources; keep independent work moving. Never infer quiescence from one clean diff or a transcript timestamp.

Keep writer/reviewer run identities separate and verdicts tied to the reviewed revision. Preserve the calling workflow's independent review and diversity gates; unavailable reviewer evidence remains unverified. Use [native history](history.md) when a workflow audits actual child tool use.
