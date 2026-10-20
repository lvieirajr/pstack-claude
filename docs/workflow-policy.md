# Workflow policy audit

This records the [issue #5](https://github.com/lvieirajr/pstack-claude/issues/5) decisions for **Claude Code and Codex only**. The source comparison is Lauren's [reviewed pstack v0.15.27](https://github.com/cursor/plugins/tree/8838150c6b4829ea3c01782631213776d86df14a/pstack), pinned by issue #4, against this fork after commit `923ecdf`. The registry contains 48 pstack file forks and one thermos fork. A registry `policy` label includes both intentional workflow changes and implementation safeguards; it does not mean every entry is an added approval policy.

## Selected behavior

| Concern | Lauren's reviewed original | Inherited port | Claude Code and Codex after #5 |
| --- | --- | --- | --- |
| Full-autopilot landing | Owner carries a PR to merge under the operator's grant and independent proof | Every PR waits for an operator click | Restore the authorized owner-to-merge path; a user review gate still wins |
| Program size | Queue scope and operator gates govern the run | Additional approval above three owners unless size was already named | State the size and use actual user limits and runtime capacity; no extra fixed approval |
| Fix-forward rounds | Return findings to the owner without a fixed two-round ceiling | Block after two rounds until the operator selects more work | Continue within the grant and its limits; stop or change approach when blocked, without weakening proof |
| Independent review and live proof | Required before merging | Explicitly blocked when an independent reviewer cannot run | Retain the closed gate; a grant or routing choice cannot invent a reviewer or proof |
| Merge and cleanup mechanics | Verified patch and current-base checks | Additional head/destination guards, readback, cancellation, leases, and data-preservation guards | Retain these safeguards; they protect the authorized action rather than requiring another manual approval |
| Activation | Invocation-based Cursor setup | Automatic native routing, with a persistent on/off setting | Retain this selectable difference explicitly; off removes the mandate, not skill availability |
| Stack delivery | Operator lands Autopilot-stack | Operator lands Autopilot-stack | Preserve the original stack contract; full-autopilot authority does not transfer to it |

The installed [autonomy contract](../plugins/pstack/skills/poteto-mode/references/autonomy.md) is authoritative for the scoped differences. It is loaded from both poteto-mode and direct full-autopilot entry. The existing steps stay intact for other harnesses. Persistent optional gates use native `CLAUDE.md`/`AGENTS.md`, with shared instruction aliases inspected before an authorized edit. No new profile framework, policy file in the user's home, installer, or model-sheet field is introduced.

## Declared-fork classification

Each row records a source-level retention decision, not a claim of identical behavior or a completed runtime workflow. Workflow/editorial extensions are retained choices rather than necessary harness translation. Mixed entries contain both. The source pins and `tools/forks.json` remain the ownership authority. Later history, delegation, proof, shipping, and scheduling issues still own the capability gaps identified here.

| Component | File | Classification | Decision |
| --- | --- | --- | --- |
| pstack | [skills/architect/SKILL.md](../plugins/pstack/skills/architect/SKILL.md) | Workflow extension | Retain reconciliation against the accepted sketch and rationale. |
| pstack | [skills/architect/references/rationale-template.md](../plugins/pstack/skills/architect/references/rationale-template.md) | Workflow extension | Retain the matching reconciliation record. |
| pstack | [skills/blast-radius/SKILL.md](../plugins/pstack/skills/blast-radius/SKILL.md) | Workflow extension | Retain the extra pre-design investigation trigger; it is an inherited policy choice. |
| pstack | [skills/bro/SKILL.md](../plugins/pstack/skills/bro/SKILL.md) | Editorial extension | Retain the extra invocation aliases. |
| pstack | [skills/create-formal-verification-skill/SKILL.md](../plugins/pstack/skills/create-formal-verification-skill/SKILL.md) | Runtime adaptation | Keep the scoped verifier prerequisites and honest draft outcome. |
| pstack | [skills/create-verification-skill/SKILL.md](../plugins/pstack/skills/create-verification-skill/SKILL.md) | Runtime adaptation | Keep the callable native project verification skill name. |
| pstack | [skills/poteto-help/SKILL.md](../plugins/pstack/skills/poteto-help/SKILL.md) | Runtime adaptation | Keep native installation, setup, public source links, and installed-playbook precedence. |
| pstack | [SKILL.md](../plugins/pstack/skills/poteto-mode/SKILL.md) | Mixed | Keep native tool/model mapping, proof and writer guards, and editorial triggers; the scoped autonomy contract overrides the manual-merge catalog description. |
| pstack | [playbooks/autopilot-full.md](../plugins/pstack/skills/poteto-mode/playbooks/autopilot-full.md) | Selectable autonomy | Restore the authorized owner-to-merge path on Claude/Codex; optional native user limits replace fixed owner-count and retry gates. Preserve the remaining verification and revision rules. |
| pstack | [playbooks/autopilot-stack.md](../plugins/pstack/skills/poteto-mode/playbooks/autopilot-stack.md) | Execution hardening | Keep revision records, cancellation before topology edits, leases, and re-verification. Operator landing is the original stack contract. |
| pstack | [playbooks/babysit.md](../plugins/pstack/skills/poteto-mode/playbooks/babysit.md) | Execution hardening | Keep identity/frontier checks and route topology blockers to their owner. |
| pstack | [playbooks/bug-fix.md](../plugins/pstack/skills/poteto-mode/playbooks/bug-fix.md) | Evidence hardening | Keep decisive failure/passing output rather than a claimed result. |
| pstack | [playbooks/feature.md](../plugins/pstack/skills/poteto-mode/playbooks/feature.md) | Execution hardening | Keep one worktree per writing delegate, based on the actual branch head. |
| pstack | [playbooks/multi-phase-plan.md](../plugins/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md) | Runtime adaptation | Keep installed-plugin reads, native workers and standing objectives; store/history/scheduler limitations remain in later issues. |
| pstack | [playbooks/opening-a-pr.md](../plugins/pstack/skills/poteto-mode/playbooks/opening-a-pr.md) | Execution hardening | Keep confirmed writer stops before publishing from a worktree. |
| pstack | [playbooks/orchestrate.md](../plugins/pstack/skills/poteto-mode/playbooks/orchestrate.md) | Runtime adaptation | Keep local worktrees and the port store; a local checkout is not cloud isolation. |
| pstack | [playbooks/pause-safely.md](../plugins/pstack/skills/poteto-mode/playbooks/pause-safely.md) | Recovery hardening | Keep canonical checkpoints and user-requested artifacts; cross-runtime history remains issue #6. |
| pstack | [playbooks/session-pickup.md](../plugins/pstack/skills/poteto-mode/playbooks/session-pickup.md) | Recovery hardening | Keep checkpoint-first recovery and original user rulings; cross-runtime history remains issue #6. |
| pstack | [playbooks/shipping.md](../plugins/pstack/skills/poteto-mode/playbooks/shipping.md) | Execution hardening | Keep service-enforced head guards, destination/applicability checks, pending-merge cancellation, repository gates, and landing readback. |
| pstack | [playbooks/worktree-cleanup.md](../plugins/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md) | Execution hardening | Keep holds for untracked/ignored data, locks, submodule/reflog work, and unsafe pruning. |
| pstack | [scripts/bootstrap.ts](../plugins/pstack/skills/poteto-mode/scripts/bootstrap.ts) | Execution hardening | Keep the clear Bun requirement and production-only dependency bootstrap. |
| pstack | [scripts/check-plan.mjs](../plugins/pstack/skills/poteto-mode/scripts/check-plan.mjs) | Runtime adaptation | Keep validation for the translated native plan skeleton. |
| pstack | [scripts/check-plan.test.ts](../plugins/pstack/skills/poteto-mode/scripts/check-plan.test.ts) | Runtime adaptation | Keep fixtures for that translated plan contract. |
| pstack | [scripts/orch/orch.test.ts](../plugins/pstack/skills/poteto-mode/scripts/orch/orch.test.ts) | Execution hardening | Keep regression coverage for store locks, branch/repository identity, TSV cells, deadlines, and isolated Git fixtures. |
| pstack | [scripts/orch/store.ts](../plugins/pstack/skills/poteto-mode/scripts/orch/store.ts) | Execution hardening | Keep exact branch refs, fork-aware PR discovery, single-line TSV cells, atomic lock takeover/release, and bounded forge calls. |
| pstack | [scripts/package.json](../plugins/pstack/skills/poteto-mode/scripts/package.json) | Execution hardening | Keep the helper typecheck covering port-only modules. |
| pstack | [scripts/watch-pr/cli.test.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/cli.test.ts) | Execution hardening | Keep CLI coverage for deadlines, unreported checks, unknown mergeability, and accurate status/help output. |
| pstack | [scripts/watch-pr/cli.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/cli.ts) | Execution hardening | Keep a shared deadline and accurate exit/status semantics; status-only success does not mean merge readiness. |
| pstack | [scripts/watch-pr/fakes.test-helper.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/fakes.test-helper.ts) | Execution hardening | Keep the test reader aligned with real revision parsing and repeatable rollup/facts changes. |
| pstack | [scripts/watch-pr/github.test.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/github.test.ts) | Execution hardening | Keep regressions for repository/branch identity, pagination, missing commands, and checks that have not reported. |
| pstack | [scripts/watch-pr/github.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/github.ts) | Execution hardening | Keep complete paged evidence, exact repository/branch discovery, bounded transport, and explicit unavailable-check state. |
| pstack | [scripts/watch-pr/policy.test.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/policy.test.ts) | Execution hardening | Keep regressions for repository gates, behind-base/unknown mergeability, stable no-check readings, and mid-read revision changes. |
| pstack | [scripts/watch-pr/policy.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/policy.ts) | Execution hardening | Keep repository blockers, revision consistency, bounded polling, and confirmation before treating absent checks as ready. |
| pstack | [scripts/watch-pr/render.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/render.ts) | Execution hardening | Keep blocker and unknown-state output distinct from readiness or command failure. |
| pstack | [scripts/watch-pr/types.compile.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/types.compile.ts) | Execution hardening | Keep compile-time landing-revision and first-sighting evidence constraints. |
| pstack | [scripts/watch-pr/types.ts](../plugins/pstack/skills/poteto-mode/scripts/watch-pr/types.ts) | Execution hardening | Keep types carrying landing identity, gate reasons, deadlines, and incomplete evidence states. |
| pstack | [skills/principle-build-the-lever/SKILL.md](../plugins/pstack/skills/principle-build-the-lever/SKILL.md) | Evidence hardening | Keep controls that establish what a measurement actually demonstrates. |
| pstack | [skills/principle-prove-it-works/SKILL.md](../plugins/pstack/skills/principle-prove-it-works/SKILL.md) | Evidence hardening | Keep checks on the process, predicted failure, actual state, and exit status. |
| pstack | [skills/principle-test-behavior-not-implementation/SKILL.md](../plugins/pstack/skills/principle-test-behavior-not-implementation/SKILL.md) | Workflow extension | Retain the explicit exception for constants that promise user-visible behavior. |
| pstack | [skills/recall/SKILL.md](../plugins/pstack/skills/recall/SKILL.md) | Mixed | Keep project-defined history scope and attributable user rulings; Claude transcript assumptions are deferred to issue #6. |
| pstack | [skills/reflect/SKILL.md](../plugins/pstack/skills/reflect/SKILL.md) | Mixed | Keep the native transcript helper and unbiased reviewer context; runtime history gaps remain explicit. |
| pstack | [skills/setup-pstack/SKILL.md](../plugins/pstack/skills/setup-pstack/SKILL.md) | Runtime adaptation | Keep native model sheets, model-selection rules, and the existing selectable routing toggle. Optional autonomy limits use native instructions. |
| pstack | [skills/show-me-your-work/SKILL.md](../plugins/pstack/skills/show-me-your-work/SKILL.md) | Execution hardening | Keep documentation of the logger escape behavior. |
| pstack | [skills/show-me-your-work/scripts/log.sh](../plugins/pstack/skills/show-me-your-work/scripts/log.sh) | Execution hardening | Keep TSV escaping, atomic row append where supported, and the existing fallback. |
| pstack | [skills/tdd/SKILL.md](../plugins/pstack/skills/tdd/SKILL.md) | Evidence hardening | Keep the actual failing content as evidence of the intended reproduction. |
| pstack | [skills/why/references/epistemics.md](../plugins/pstack/skills/why/references/epistemics.md) | Evidence hardening | Keep human decisions attributable and within their original scope. |
| pstack | [skills/why/references/investigator-prompt.md](../plugins/pstack/skills/why/references/investigator-prompt.md) | Evidence hardening | Keep investigators returning the original attributable user ruling. |
| pstack | [skills/why/references/synthesizer-prompt.md](../plugins/pstack/skills/why/references/synthesizer-prompt.md) | Evidence hardening | Keep the corresponding synthesis rule and resolvable source link. |
| thermos | [skills/thermo-nuclear-code-quality-review/SKILL.md](../plugins/pstack/skills/thermo-nuclear-code-quality-review/SKILL.md) | Workflow extension | Retain the inherited subsystem/detail report format; it is a thermos policy, not a pstack translation. |

## Verification boundaries

Source-contract regression checks guard authorization, stops, missing independent evidence, scoped dispatch, and current-revision gates against being dropped in a later sync. The hook fixtures run real fresh processes with each runtime's persistent routing sheet. These checks do not establish how a model will apply a free-text instruction. A model-backed grant/stop/review scenario and a disposable live PR merge remain separate evidence tiers; no such result is claimed by a passing source-contract test.

## Issue #5 validation record

On macOS with the unchanged 0.9.93 package metadata, the full root suite passed **1,265 tests**, skipped 40, and failed none across 45 files. The six added checks are source-contract regression guards, not model-driven merge simulations. Generator and skill validation passed; the pstack pin audit retained 85 unchanged files and 48 declared forks without conflicts, stale/undeclared forks, or denylist hits.

Disposable Git-marketplace installations on Claude Code 2.1.292 and Codex 0.163.0 each registered one enabled plugin and carried byte-identical autonomy, entrypoint, playbook, and setup files. Installed POSIX hooks read each runtime's persistent sheet across fresh processes: missing settings injected the mandate, off stayed off, and on stayed on. Pre-existing Claude/Codex instruction symlinks to a shared file and their manual-review preference were preserved through native install and removal. This establishes packaging, settings persistence, and preservation; it does not establish model interpretation of those instructions. The fixture used a local Git URL rewrite, not a published test repository, and did not change the live home.
