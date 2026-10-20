# Compatibility baseline

This is the starting contract for [issue #1](https://github.com/lvieirajr/pstack-claude/issues/1), recorded on 2026-10-18. It describes the reviewed implementation and the evidence available for it. It is not a claim that every workflow already works in every harness.

The current targets are **Claude Code and Codex only**. The original four-harness roadmap and research below are historical evidence. The scope was narrowed on 2026-10-19: personal changes for other harnesses are restored to the inherited `pstack-claude` baseline at `3cff27a2dda8ab0390e3db55f4190539c5b86759`. Their native code, mappings, hooks, tests, and shared model data remain inherited; Claude/Codex additions in shared skill files are explicitly scoped to those two harnesses. Archived research is retained and does not establish a current support commitment.

## Source and behavior baseline

| Source | Revision | Version | Purpose |
| --- | --- | --- | --- |
| Michael Denyer's port, inherited by this fork | `3cff27a2dda8ab0390e3db55f4190539c5b86759` | 0.9.93 | Starting implementation |
| Lauren Tan's original, pinned by that port | `99743e9c151c8537cbbf1f98bb38f34ef3368453` | 0.15.25 | Mechanical translation and declared-fork comparison |
| Original pstack snapshot reviewed for parity | `8838150c6b4829ea3c01782631213776d86df14a` | 0.15.27 | Reference behavior for this roadmap; current pstack pin after issue #4 |

The original local Jarvis copy at `933da29fe88f64e715d1a446fd1ce045b429e5ef` matched all 171 source files in the reviewed original snapshot. At the inherited baseline, the port retained 53 of the 55 upstream skill directories (including all 24 principles) and all 23 playbooks, with 47 declared pstack file departures from its derived pin. Issue #4 imports the missing formal-verification skill and pins the reviewed v0.15.27 snapshot; only the Grok Bot UI skill remains excluded from those 55 upstream skill directories. The formal-verification prerequisites add one declared file fork. A file-fork count is not a count of separate policy changes.

Preserve the original workflow's intent, scope, independent reviewers, real-surface proof, evidence, and user-authorized autonomy. Different native tool names are expected. Skipping a required reviewer, substituting the writer's self-review, or replacing required observed evidence with an unsupported summary does not establish parity.

Important existing differences remain explicit:

- On Claude Code and Codex, the installed [autonomy contract](../plugins/pstack/skills/poteto-mode/references/autonomy.md) restores an authorized full-autopilot owner-to-merge path while preserving independent proof, explicit user gates, and revision-safe shipping. The [policy audit](workflow-policy.md) records the retained differences and optional native instruction limits. Other harnesses retain the inherited operator-merge behavior.
- Native routing is enabled by default; model roles and state paths remain partly Claude-oriented.
- Local worktrees replace Cursor cloud execution, without providing independent machines or services.
- Grok Bot and Benny are excluded. The original's formal-verification skill is bundled after issue #4; its chosen verifier must be installed separately, and importing it does not establish a completed proof.
- Stronger watcher, cleanup, and checkpoint safeguards are useful changes to assess individually, not reasons to revert the whole port.

The [fork registry](../tools/forks.json) and [source pins](../tools/upstream.json) remain authoritative for code ownership. The archived [original audit](research/portability-audit.md), [171-file inventory](research/portability-inventory.md), and [port comparison](research/pstack-claude-comparison.md) preserve the research behind this baseline. Those reports describe their frozen snapshots, not the current working tree or completed roadmap tasks.

## Evidence levels

Use these labels per capability, not as a score for a whole harness:

| Label | Meaning |
| --- | --- |
| Source | A manifest, mapping, or workflow describes the behavior; execution is not established |
| Fixture | Automated local tests exercise the mechanism, often with a fake host or child process |
| Runtime | A real installed harness passed a specified check without a model call |
| Reported | The upstream maintainer records a live/manual result; this evaluation did not repeat it |
| Gap | Missing, changed, restricted, or unverified behavior that prevents a blanket parity claim |

An offline fixture is not a live model workflow. A successful plugin install is not proof that a model invokes a skill or completes its review. Every future live result must record the harness version, execution mode, source revision, configured models, command/scenario, and observed evidence. Missing checks remain visible.

## Capability matrix

These cells summarize the inherited implementation. Follow the [runtime reference](reference.md#runtime-support), [Pi mechanism evidence](pi-equivalence.md), and archived comparison for scope and sources.

| Capability | Copilot CLI | Copilot app | Codex | OpenCode | Pi |
| --- | --- | --- | --- | --- | --- |
| Installation and discovery | Fixture; reported marketplace smoke | Reported shared plugin loading | Runtime: native plugin install/list on 0.163.0 | Reported CLI discovery | Runtime: package/child startup on 1.1.0 |
| Skill invocation | Reported CLI smoke; noninteractive host caveat below | Reported manual check | Source mapping; model invocation unverified here | Reported CLI/desktop loading | Source native skills; full catalog invocation unverified here |
| Routing and instructions | Fixture; reported SessionStart | Reported manual check | Fixture hook contract; real hook trust/injection unverified here | Gap: explicit invocation/standing instructions | Fixture; reported prompt injection |
| Model roles and effort | Fixture sheet/dispatch checks; reported setup | Reported setup | Source mapping; model dispatch unverified here | Gap: no concrete execution mapping | Fixture; runtime catalog; reported OpenAI dispatch |
| Worker lifecycle | Source mapping; reported dispatch | Source session primitives; reported dispatch | Source mapping; lifecycle unverified here | Reported CLI delegation; remaining lifecycle unverified | Fixture lifecycle; reported live child runs |
| Independent review | Source policy and agents; complete review unverified here | Source policy; complete review unverified here | Gap: requires permitted agents/capacity; complete review unverified | Gap: adapter and multi-model review incomplete | Fixture mechanics; complete pstack review workflow unverified here |
| Live application proof | Source driver policy; project-specific proof unverified | Source app tools; project-specific proof unverified | Source driver mapping; proof unverified | Gap: adapter/driver integration | Source driver mapping; proof unverified |
| PR delivery and merge authority | Fixture shared helpers; end-to-end unverified | Source stack/session tools; end-to-end unverified | Fixture shared helpers; end-to-end unverified | Gap: adapter; shared helpers available | Fixture shared helpers; end-to-end unverified |
| Scheduling and unattended work | Gap: cadence fallback is not durable scheduling | Source native automation mapping; recovery unverified | Gap: no portable durable loop implementation | Gap: no concrete scheduler adapter | Fixture/reported timers; only live interactive parent scheduling |
| History and resume | Source transcript mapping; fixture reader/checkpoints | Source mapping; app history coverage unverified | Native scoped helper and checkpoint fixtures; real Codex persisted-history read; full model-driven history workflows unverified | Gap: no concrete history adapter; shared checkpoints available | Fixture transcript/branch reader and checkpoints |

The maintainer's reported checks are useful evidence, but their presence does not upgrade an untested full workflow. The Pi live table records an OpenAI sign-in; Anthropic and legacy OpenAI-Codex model IDs were catalog-checked, not called live in that report. Required independent review stays closed when no eligible reviewer can run.

## Versions and known limits

This is a versioned evidence baseline, not a promise of compatibility with all later releases.

| Component | Recorded version | Evidence and boundary |
| --- | --- | --- |
| Bun | CI: 1.3.14; local evaluation: 1.4.3 | Existing CI baseline and independently observed local runs; do not report them as the same environment |
| Node.js | Local: 24.22.0 | Used for Node helpers and installed Pi probes; a broad version range has not been established |
| Git | Local: Apple Git 2.54.0 | Real fixture repositories/worktrees; tests must supply their own identity/signing policy |
| GitHub CLI | Local: 2.102.0 | Needed for GitHub workflows; authenticated PR writes were not part of the baseline evaluation |
| Codex CLI | Local: 0.163.0 | Disposable native marketplace/plugin installation passed; no model-backed playbook run |
| Copilot CLI | Upstream report: 1.0.87 through 1.0.92 | Not installed in the local evaluation; signed-in smoke tests were not independently repeated |
| Copilot app | Upstream manual report: 2026-09-25 | No exact app build recorded in the source report; no independent app run |
| OpenCode | Upstream report: 2.0.30 | Discovery/loading and CLI delegation reported; model panels and complete workflows remain unverified |
| Pi | CI and disposable runtime: 1.1.0 | Typecheck, model catalog, and child startup passed; no independent model-backed run |

The current official [Codex subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) uses `[agents] enabled` and `max_concurrent_threads_per_session`; it does not require the old `[features] multi_agent` snippet. The [Codex mapping](../plugins/pstack/skills/poteto-mode/references/codex-tools.md) reflects that guidance. Host policy and the actual exposed tool schema still determine whether delegation is available; updating a local config does not override them.

Copilot CLI 1.0.92 has a maintainer-reported case where a cached computer-use experiment leaves `-p` sessions without plugin skills while interactive sessions work. This has not been independently reproduced here. Record the exact version and mode if encountered; do not clear the user's caches or broaden permissions silently. Copilot CLI and app are distinct test targets.

Pi process recovery may require `/proc` or `ps` to identify orphan processes. A sandbox denying process inspection can prevent that guarantee. Its interactive timers do not imply durable jobs after exit. Worktree isolation does not isolate application ports, databases, browsers, or credentials.

## Native installation contract

Claude Code and Codex install this fork through their existing marketplace/plugin commands. Dotfiles only invoke those commands after the CLIs and prerequisites are installed. Each harness owns its plugin files, caches, registration, updates, and removal. There is no custom installer, shared package checkout, skill-link manager, generated bridge, ownership manifest, or canonical pstack JSON configuration.

Install the complete native plugins, including their skills, supporting scripts, and hooks. Do not also expose pstack through shared skill links, which can duplicate discovery. Existing unrelated skills and shared instructions remain in place. Model choices use each harness's inherited native setup procedure.

The native Claude and Codex instruction files on the inspected machine resolve to the same `~/.agents/AGENTS.md`. Model setup must account for these aliases; native installation does not make those instruction files independent. Never mix conflicting runtime-specific choices in that shared file. This cleanup does not run model setup or rewrite those instructions.

Issue #3 now covers the small dotfiles integration and native installation verification. The earlier managed-`~/.agents` design and its installer tests have been withdrawn. Verify clean native installation in disposable homes without running the machine bootstrap or changing the live home. Keep native hook trust and model-backed workflow checks separate from registration checks.

Keep inherited version **0.9.93** during development. The user will introduce this fork's own version for its first ready release. Claude's remote plugin updates rely on the declared version, so unchanged development metadata does not establish an automatic upgrade path between commits. Verify versioned updates before that first release.

## Reproduce the code baseline

Use the existing toolchain rather than migrating package managers. From this repository:

```shell
bun install --frozen-lockfile
bun tools/generate.mjs --check
bun test tests/
```

Run the independently packaged helper checks from their directory:

```shell
cd plugins/pstack/skills/poteto-mode/scripts
bun install --frozen-lockfile
bun run typecheck
bun test orch watch-pr check-plan.test.ts
bunx prettier@3.6.2 --check .
```

These are offline/code checks after dependencies are prepared. They make no model calls. Root dependencies include `typebox`; the helper package has its own lockfile and dependencies. An unavailable dependency fetch is an environment failure, not a passing test.

Fixtures set their own Git identity and disable signing only for disposable fixture repositories or individual fixture commands. Do not change global signing settings or use a personal signing agent just to run the suite. Existing tests exercise commits, restacking, cleanup, and checkpoint lookup with real Git state.

Keep restricted-environment results separate. Do not skip process recovery tests and call them passed: either run them where process inspection is permitted, or record the exact blocked tests and limitation. A targeted rerun does not become a claimed full unrestricted suite run.

When Pi 1.1.0 is available, the following checks need no model account:

```shell
bun tools/typecheck-pi.mjs
PSTACK_PI_REQUIRE_CATALOG=1 PSTACK_PI_REQUIRE_RUNTIME=1 bun test tests/pi/catalog.test.mjs tests/pi/runtime.test.mjs
```

Use `PI_PACKAGE_DIR` for a disposable installed package. The typecheck resolves a pinned compiler through `bunx`, so its first run may need network/cache access. The catalog check establishes that IDs exist, not that the account can call every model.

Signed-in/model-backed checks are a separate explicit tier. Examples include `tests/copilot-smoke.sh`, `PSTACK_PI_LIVE=1 bun test tests/pi/live.test.mjs`, and the Claude skill-collision probe. Shipping's disposable live repository test creates, merges, and deletes a repository. None of those should be mistaken for an ordinary offline baseline command. See [contributor checks](../CONTRIBUTING.md#before-you-open-a-pr) for their exact scope.

## Verification record

The archived [comparison verification](research/pstack-claude-comparison.md#8-verification-performed-and-its-limits) records the initial evaluation: generator current; root 1,243 pass / 40 skip / eight sandbox failures; targeted process-recovery rerun 25 pass / zero fail, including those eight; helper typecheck and 258 tests pass; Pi installed-runtime checks four pass and typecheck pass; Claude manifests and disposable native Codex installation pass.

Fresh issue #1 checks on the local issue branch, based on the inherited revision above, used macOS, Bun 1.4.3, and Node.js 24.22.0. Process inspection was permitted for the process-recovery tests. The root/helper test process used a temporary global Git configuration requiring signing with an unavailable signer; fixture repositories or commands supply their own unsigned policy. Personal Git configuration was not edited.

| Check | Observed result |
| --- | --- |
| Signing-failure reproduction | Before the fixture fix, the existing cold checkpoint test failed on its setup commit; after the fix, it passed under the same temporary signing requirement |
| Root suite, including the added signing regression and real installed Pi probes | 1,256 pass, 36 skip, zero fail across 45 files; skipped checks remain unverified |
| Helper typecheck and tests | Typecheck passed; 258 pass, zero fail across ten files |
| Generator and invariants | 88 generated files current; skill references, model/config structure, packaging, and hook checks passed |
| Offline derivation against the materialized recorded pstack pin | 85 unchanged files, 47 declared forks; zero writes/conflicts, undeclared/stale entries, or denylist hits |
| Pi 1.1.0 | Extension typecheck passed; installed startup/catalog checks included in the root result, with no model calls |
| Codex CLI 0.163.0 | Marketplace registration, native plugin install, and installed/enabled listing passed in a disposable `CODEX_HOME` |
| Helper formatting | Prettier 3.6.2 check passed |
| Documentation | Markdownlint 0.18.1 passed; lychee 0.24.2 offline local-file/fragment check passed |

The new checkpoint regression publishes and reads an actual artifact with an unavailable global signing agent and no globally supplied fixture identity. This guards the reproduced setup failure without changing production signing behavior. The full root run retains platform-specific and model-backed skips; Copilot/OpenCode sessions, model-backed Pi workflows, live PR writes, and dotfiles deployment were not executed. Source-only and reported cells in the capability matrix remain unchanged by these code checks. No compatibility score or blanket end-to-end support is inferred from the passing counts.

### Issue #4 source sync

On 2026-10-19, issue #4 advances only the pstack component from `99743e9c151c8537cbbf1f98bb38f34ef3368453` (v0.15.25) to the reviewed `8838150c6b4829ea3c01782631213776d86df14a` (v0.15.27). The sync adds the formal-verification skill and updates seven existing skill files. Help and setup conflicts retain the port's native runtime procedures while incorporating the new formal-verification routing and setup offer. The other component pins and release metadata stay unchanged at their inherited values.

| Check | Observed result |
| --- | --- |
| Root suite with temporary unsigned fixture Git settings | 1,259 pass, 40 skip, zero fail across 45 files |
| Generator and skill validation | 89 generated files current; packaging, links, frontmatter, and hook checks passed; skill-creator validator passed for the added skill |
| Pstack ownership audit at the new pin | 85 unchanged files, 48 declared forks; no conflicts, undeclared/stale forks, or denylist hits |
| Other component ownership audits | cursor-team-kit: six unchanged files; thermos: four unchanged files and one declared fork; both passed |
| Claude Code 2.1.292, native local-folder installation | Source changes available in the registered folder; 64 installed skill entrypoints match the working source |
| Claude Code 2.1.292, native Git installation | Same-version `plugin update` kept 63 skills; native uninstall/install refreshed to 64 matching entrypoints, with one enabled registration |
| Codex 0.163.0, native local-folder and Git installations | Native refresh/add produced 64 matching installed entrypoints and the new prompt stub, with one enabled registration |
| Codex app-server `skills/list`, after Git refresh | 64 distinct pstack skills; new `pstack:create-formal-verification-skill` enabled and present once; no discovery errors |
| Documentation | Markdownlint and offline local-file/fragment link checks passed |

The native checks used disposable homes, a baseline source commit followed by the uncommitted working snapshot, and the actual CLIs. A temporary Git URL rewrite routed the Git-marketplace fixture to a local repository; nothing was published. Every installed skill entrypoint was compared byte for byte with the working source. The [development refresh procedure](reference.md#refresh-a-development-installation) records the native commands needed while the package version remains 0.9.93.

These checks do not exercise remote GitHub fetching, live-home installation, model-backed skill invocation, native hook trust, verifier installation, or a completed formal proof. The imported skill requires the chosen verifier and its runtime dependencies; an unexecuted generated check remains a draft. Automated updates between versioned releases will be verified with the first ready release.

### Issue #5 workflow policy

The [policy audit](workflow-policy.md) classifies all 48 pstack forks and the one thermos fork after issue #4. A Claude/Codex-only installed contract restores authorized full-autopilot merges and replaces the inherited fixed owner-count/retry gates with native user or repository limits. It preserves manual review requests, stops, independent review, real-surface proof, current-revision shipping checks, and the separate operator-landed stack workflow. Routing remains explicitly selectable through the inherited model-sheet setting.

The root suite passed 1,265 tests with 40 skips and zero failures. Generation and the pstack ownership audit passed. Native Git-marketplace fixture installs on Claude Code 2.1.292 and Codex 0.163.0 carried the new contract and its entrypoint links, retained one enabled registration, preserved shared instruction symlinks and contents, and read on/off routing choices across fresh installed-hook processes. The [validation record](workflow-policy.md#issue-5-validation-record) distinguishes those checks from model-backed authorization, stop, independent-review, and actual merge scenarios, which were not executed.

### Issue #6 native history

The installed [history contract](../plugins/pstack/skills/poteto-mode/references/history.md) routes Claude Code and Codex recall, habit mining, reflection, trail auditing, Eval, and pickup transcript fallback through exact workspace/run evidence. The checkpoint remains first for pickup. The adapter uses configured Claude project transcripts and their linked message branch, or Codex's read-only native paginated history. Native host exports remain usable under the same evidence requirements. The two new declared upstream departures are the scoped automate-me and Eval entrypoints; the other affected skills were already declared forks.

| Check | Observed result |
| --- | --- |
| Root suite, Bun 1.4.3 / Node.js 26.12.0 | 1,291 pass, 40 skip, zero fail across 46 files |
| New history regressions | 26 pass; exact IDs, concurrent copies, workspace/config roots, branches, paging, incomplete evidence, launch boundaries, private exports, and symlink invocation |
| Pstack ownership at the unchanged v0.15.27 pin | 83 unchanged files, 50 declared forks; no conflicts, stale/undeclared forks, or denylist hits |
| Generator and installed skill references | 89 generated files current; link, prose-path, model, packaging, and hook checks passed |
| Codex CLI 0.163.0, actual current conversation | Read only that thread in its declared workspace; 35 persisted turns included native command/tool records. Only counts and limitations were logged, not transcript content |
| Claude Code 2.1.292, isolated runtime fixture | A localhost scripted response provider drove the actual CLI and a real Read tool call. The helper recovered seven linked native records and the actual tool result under a relocated Claude config home, without external inference |
| Native Git plugin installations, both CLIs | Final helper modules and history reference matched the source; one enabled registration each; installed helper read the configured Claude source and queried an isolated Codex home, with no Claude substitution for an unavailable Codex run |
| Artifact placement | Explicit new temporary exports used private file permissions; plugin fixture registrations were removed; no transcript/state/credential files were added to the repository or dotfiles |
| Formatting and documentation | New JavaScript passed Prettier 3.6.2; Markdown and offline link checks passed |

Non-leaf selection, nested truncated content, symlink invocation, and an empty launch-boundary argument were demonstrated as failures before their fixes. The existing Pi/Copilot readers, worktree audit, hooks, models, installation commands, component pins, and 0.9.93 release metadata remain unchanged.

These checks establish retrieval and installed execution, not model judgment in a complete recall, habit-mining, reflection, trail-review, or blinded Eval workflow. The Codex read covers persisted native history, not buffered activity in another running host. Unknown Claude layouts, ambiguous branches, compaction/content gaps, remote-only history, and older unsupported Codex methods require an explicit native source or a precise limitation. Digests remain permitted only where the original workflow allows them; they cannot pass tool-read grading or complete an unavailable transcript audit.

### Issue #8 native delegation

The installed [delegation contract](../plugins/pstack/skills/poteto-mode/references/delegation.md) scopes Claude/Codex capacity, lifecycle, source identity, and independent-review handling. Small pointers in arena, swarm, interrogate, how, reflect, poteto-mode, and orchestration preserve their inherited phases and reports. The native Claude delegate and its generated effort variants now require the parent's exact installed source instead of picking the highest cached version. No orchestration engine, installer, dependency, shared model data, source pin, or release metadata changed.

The source comparison used Lauren pstack at the existing v0.15.27 pin, `8838150c6b4829ea3c01782631213776d86df14a`. Her standalone briefs, fresh workers, separate outputs, parent synthesis, Arena phase barriers, Interrogate's no-auto-apply verdict, distinct-model review, and retained coverage/evidence requirements remain. Native capacity changes placement, not the number of required lanes. A restarted session does not establish whether a native worker or background process is dead.

| Check | Observed result |
| --- | --- |
| Root suite, Bun 1.4.3 | 1,298 pass, 44 skip, zero fail across 47 files after the seven new Claude history regression cases; four opt-in native checks are among the skips |
| Opt-in native suite | Four tests passed separately, with five runtime scenarios across Claude and the two Codex tool surfaces |
| Claude Code 2.1.292 | Actual `Agent`, `SendMessage`, and `TaskStop` execution; ten distinct child runs under a two-worker cap, expected capacity rejection, queued dispatch, configured model routing, installed-source hashes, and isolated worktree receipts |
| Codex CLI 0.163.0, current `collaboration` surface | Actual namespaced actions and code-mode commands; ten distinct task addresses under the cap, follow-up, native status collection, and retained artifacts. Slot release was observed through subsequent successful dispatches, without inventing `close_agent`; the selected child's tool history was recovered through the parent's native `subAgentActivity` path-to-thread binding |
| Codex CLI 0.163.0, legacy `multi_agent_v1` surface | A separate local-provider fixture used legacy spawn/wait/follow-up/close, retained ten child IDs and outputs, and recovered a selected child's persisted native history after the parent CLI exited |
| Native installation and source identity | Disposable Git marketplace installs in relocated homes; actual children read the enabled installed entrypoint, delegation reference, and relevant swarm/arena/interrogate skill bytes. Source hashes and exact input heads matched; writer outputs stayed in separate branches/worktrees |
| Cancellation and replacement, both CLIs | A supervised fixture writer ran a real background process. Claude's successful stop acknowledgement or Codex's subsequent `interrupted` task status was checked separately from process inspection; a fresh replacement in another worktree started only after both the native task and its subprocess were observed stopped. Codex denied an earlier process inspection, which remained unknown rather than a pass |
| Recovery evidence | Both CLIs and both Codex tool surfaces exposed the selected child's actual tool history after parent exit. On current Codex, workspace/ancestor listings omitted the child; parent activity metadata supplied its exact persisted UUID for a direct read. Exports passed `--require-complete` and contained the child command, worktree, input head, and source hashes |
| Independent instruction exercise | A separate current-host agent read the installed contract and [raw recovery case](../tests/fixtures/delegation-recovery.json). It identified seven potentially eligible lanes, rejected duplicate/stale/superseded receipts, kept unknown ownership quarantined, and rejected writer self-review. It also noted that named artifacts without their contents do not establish substantive acceptance |
| Bounded real-model Codex Swarm | A user-authorized 300-second run used the configured `gpt-6.1-sol` at `xhigh`, three required synthetic coverage lanes, and a one-worker cap. L1 returned a correct `ISSUES` report with an actual failing Node assertion, current input head, and matching installed-source hashes. L2 started only after L1 completed; it had no report at timeout. L3 never started, and no consolidated report was produced. This is incomplete coverage, not a passing Swarm workflow |
| Completed real-model Swarm, both harnesses | After the initial timeout, the approved 900-second Codex rerun and the native-login Claude run each completed all three lanes under a one-worker cap, with three distinct child identities and a consolidated report. Every child returned `ISSUES`, correctly reproduced its assigned defect, read and hashed the installed sources, and retained its current input head. Caller-side checks matched actual tool results and report writes; independent reproductions confirmed all three defects. Tracked source inputs stayed unchanged |
| Real-model history audit | Exact parent and child histories were recovered for all six completed workflows. The initial Codex export-availability misreport led to the adapter-check instruction. Real Claude transcripts exposed attachment tips, native active-leaf markers, and parallel tool blocks split across UUID paths. The fixed reader recovered every recorded tool call/result ID from all four Interrogate reviewers and all six Arena attempts, including the interrupted judge. Root exports matched all 40 Interrogate and 91 Arena tool calls observed in the native CLI streams. All 33 history tests pass, including true ambiguity, conflicting results, and stale-marker failures |
| Same-model Interrogate, both harnesses | Four fresh independent reviewers under a two-worker cap, complete retained reviews and consolidated lead judgments. All identified the three seeded defects with real Node reproductions. The leads merged findings, recorded agreement/scope differences, and applied no recommendations. Actual native model identities, source hashes, current heads, report writers, and unchanged tracked inputs were checked |
| Same-model Arena, both harnesses | Four candidate writers on separate branches/worktrees, private rubric, independent judge after candidate completion, base selection, selective test grafts, and actual final verification. Caller reran all eight candidate suites and both final suites; a separate 32-case contract probe passed on every candidate and synthesis. Both 900-second initial runs timed out before their final reports; bounded parent continuations completed them while retaining existing candidates. Codex reused its complete judge verdict. Claude retained its interrupted first judge as a non-voting partial attempt and launched a fresh replacement for that same logical seat |
| Ownership and packaging | 78 unchanged pstack files, 55 declared forks at the unchanged pin; no conflict, stale/undeclared fork, or denylist failure. 89 generated files current |

The native fixture responses are scripted over localhost. They exercise real tools, registration, worktrees, child identities, process handling, and persisted evidence; they do not establish model judgment, external account access to the routed model names, or a complete multi-model Arena/Interrogate verdict. The independent instruction exercise used one separate agent, not a diverse-model panel. These limits remain separate from the passing native mechanics.

The first 300-second Codex Swarm run (`01a157a7-8214-78c3-bc12-04d2eb99d0e4`, fixture source `c7795a558012ad3eac806f1a1ebdb19d5daffb24`) retained partial evidence and was cleaned after process inspection; it remains an incomplete attempt. The completed Codex rerun used fixture source `2647c9bd006281f4fe2fc7165b626d9985e4722c`, input `f758295046a79515e96568db1532c7b621afc602`, and native root `01a158fc-5c65-7d22-b6ef-2c483a72c92c`, inheriting `gpt-6.1-sol` at `xhigh`. The completed Claude run used source `4ebb12ab168c546f60e8d4b92064cda25c2f2e43`, input `b1548b338e8a3494b0e73e4557d6bf5b44368df2`, and root `82c12a8b-ff50-4039-8ae0-efcf7c51da4f`, inheriting the native `claude-opus-5-5` model. Both snapshots are based on repository commit `30b813e48541c20346730ef0918fcc8f1d7bd88d`. The installed Swarm SHA256 was `76563c1e23c22aec87b65aaa9336aa40413fa1858142f04b2aab18dce9c25d51`, and the corrected delegation reference was `24cf64b4a9bafd436f55bc99aa680bf7efbbbd4069620b37cd4a3d7e2b636778`. Native logins were used without credential copying or live configuration changes; scoped source identities, reports, native exports, and caller verification remain private temporary artifacts.

The Claude reader correction adds no SDK or alternate storage. It retains linked attachments and uniquely bound blocks/results of the same native response. Actual conversation forks need a native active-leaf identity or explicit selection; invalid/stale pointers and unresolved ambiguity still fail closed. The initial real-panel exports used a fresh native installation of SHA256 `d92afe7bcaa77defdf2a267cb58481d47ffd0a467bf4ce8383ad610cfe6f3708`. Final review reproduced a case where reused API message IDs could combine actual forks. The tightened reader requires unique native block indices and consistent request IDs, or a single unindexed assistant chain. A fresh native installation of final reader SHA256 `5d90c4de217b236e3d7152ea026afa39dbfb48cfc6053ecd601f4b6d801300ba` replayed the 12 saved native JSONL transcripts with only workspace paths remapped to a disposable directory. All selected leaves, 317 tool-call IDs, and 317 result IDs matched the prior validated exports. No new model call was made for this replay. Seven added regressions cover metadata/leaf selection, split parallel evidence, actual forks, conflicting results, reused API IDs, and native block/request collisions.

| Model-driven panel | Native root, retained across continuation | Installed fixture source | Input head |
| --- | --- | --- | --- |
| Codex Arena | `01a15917-c3c3-7d90-afe4-b42c4e8a8f1f` | `ed7b2dc1fd2dd7a5c6fedd2465b279c3ad11ecc5` | `89d9f3d175bc97507d0603981b5183cabaf01840` |
| Codex Interrogate | `01a15918-a61a-7061-a078-0332c5b8a1b7` | `93a931de3cb2a6030378c62efb03dda3d0f2c483` | `39407175a41e58c723e01eaf1fbf8ad1742fcb5e` |
| Claude Arena | `bcb2efa4-9d1f-4ff5-b12a-e8e30f9527cb` | `b7d23e011ad774eb2a2ebc47c64d23e0fd2a376a` | `16cf8e3f7a661a172cc5d98edf853ee98fb948c9` |
| Claude Interrogate | `0279955b-c728-44a6-80e2-a86cfcaa3da5` | `66cf71d17ddc40ebd75f6dd20c3001bd6957850b` | `a865b31c59e4cb75b8a8676c891f3fe506a7fc1d` |

All Codex seats resolved to `gpt-6.1-sol` at `xhigh`; all Claude seats resolved to `claude-opus-5-5` with native effort. The user deliberately chose the same model for each harness's seats and judge. Both Arena continuations retained their exact parent IDs and input heads, did not rerun completed candidates, and finished within their additional 600-second bounds. Claude's old judge task was unavailable in the new process, and its saved partial trace supplied no verdict. The fresh judge preferred C4 while the parent preferred C2; the parent compared both rationales and verified the identified test gap before retaining C2. Only the replacement's verdict counts. All panels label `panel diversity: reduced`; none satisfies a gate requiring diverse models or establishes strongest-model access.

After saving scoped native exports, reports, source identities, caller verification, and final worktree status privately, process scans found no matching fixture process. The completed synthetic workspaces and isolated plugin registrations were removed. Existing native logins were used without copying credentials or changing live configuration; dotfiles were untouched. Source and model verification is distinct from proving every workflow on every host/version.

Current Codex logical task paths must not be passed off as history UUIDs. Native parent activity can bind the exact task path to its child UUID; the actual child export supplies the tool evidence. Parent receipts and summaries alone cannot satisfy that audit. Hosts without a supported binding or export must retain the explicit evidence gap. Unknown ownership, unavailable nesting/tools, missing model choices, and hosts without a supported capacity-release path retain the contract's explicit blocked outcome. This issue does not claim cloud-machine isolation or reliable unattended scheduling, which remain separate roadmap work.

Reproduce the native checks with installed `claude`, `codex`, Git, Node.js, and Bun:

```shell
PSTACK_NATIVE_DELEGATION=1 bun test tests/native-delegation.test.mjs
```

The suite strips ambient provider credentials/settings, uses disposable homes and a local Git source, supplies localhost responses, removes native fixture registrations, and deletes its temporary workspaces. Claude loads the registered installed plugin by its explicit native plugin directory. No real-home plugin installation, dotfiles change, or external model call is made by this suite.

## Workflow acceptance scenarios

These are the live parity scenarios for later work, not tests that issue #1 claims to have executed:

| Scenario | Required observation | Roadmap issues |
| --- | --- | --- |
| Install and invoke | Dotfiles-provisioned fresh session loads the selected revision, instructions, and required native components once | [#3](https://github.com/lvieirajr/pstack-claude/issues/3), [#7](https://github.com/lvieirajr/pstack-claude/issues/7) |
| Investigate | Correct source/history scope, traceable findings, and accurate unavailable-source reporting | [#6](https://github.com/lvieirajr/pstack-claude/issues/6), [#7](https://github.com/lvieirajr/pstack-claude/issues/7) |
| Fix a bug | Intended failure reproduced, fix verified on the real surface, no unrelated edits | [#7](https://github.com/lvieirajr/pstack-claude/issues/7), [#9](https://github.com/lvieirajr/pstack-claude/issues/9) |
| Delegate and review | Correct roles/models, independent reviewers, traceable results, cancellation and replacement behavior | [#2](https://github.com/lvieirajr/pstack-claude/issues/2), [#8](https://github.com/lvieirajr/pstack-claude/issues/8) |
| Pause and resume | Same project/run and intact artifacts recovered; changed or missing evidence diagnosed | [#6](https://github.com/lvieirajr/pstack-claude/issues/6), [#11](https://github.com/lvieirajr/pstack-claude/issues/11) |
| Deliver a PR | Current revision reviewed and proven, repository rules respected, only authorized external actions taken | [#5](https://github.com/lvieirajr/pstack-claude/issues/5), [#10](https://github.com/lvieirajr/pstack-claude/issues/10) |
| Run unattended | Durable objective/grant, idempotent wakeups, recoverable work, effective operator stop | [#11](https://github.com/lvieirajr/pstack-claude/issues/11), [#12](https://github.com/lvieirajr/pstack-claude/issues/12) |
| Trigger bot integrations | Real scoped events, supported backend, protected secrets, observed results/recovery | [#13](https://github.com/lvieirajr/pstack-claude/issues/13) |

Work one issue at a time. Agree on its focused plan, implement and verify, review the uncommitted result together, then commit/push to the fork after review. This baseline does not close the later issues or authorize a dotfiles deployment.
