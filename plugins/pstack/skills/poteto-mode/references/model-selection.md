# Model selection contract

Apply this reference only on Claude Code and Codex; other harnesses retain inherited model selection.

## Selection and validation

A saved role override wins. Otherwise ordinary default/worker roles use `inherit-parent` (`auto` is equivalent), overriding shared examples and fallbacks. Omit the model selector for native inheritance and check whether an agent configuration changes that behavior. Report conflicting defaults rather than substituting a fixed model.

Strongest judgment roles and panels require confirmed native choices. Shipped values are examples, not evidence of account access or which model is strongest. Check the resolved model and reasoning level against the current schema, catalog and native agent configuration. Report unavailable selectors, unsupported choices or access failures; do not silently substitute models or drop effort settings.

`session` means no reasoning override: inherit on the same model; after switching models use the selected model's native default unless explicitly configured. Supported effort levels vary by model and harness.

## Panels and review gates

Keep the configured seat count and resolve aliases before assessing diversity. Model diversity requires at least two distinct model identities; repeated models or different effort levels do not supply it. Record provider diversity separately. If the user chooses a reduced-diversity workflow, record `panel diversity: reduced` and its limitation. It cannot satisfy a gate requiring diverse models. Independent review still requires separate reviewers.

## Native mappings

| Harness | Model selection | Reasoning |
| --- | --- | --- |
| Claude Code | Use the active `Agent` model enum; omit it for inheritance. | Use `Agent.effort` when supported (Claude Code 2.1.292 or later), checking the model's accepted levels. |
| Codex | Use the exposed selector or existing native agent configuration. Supply a fresh agent context if that selector requires one. | Use `reasoning_effort` only when exposed and supported. Report unavailable selection rather than ignoring it. |
