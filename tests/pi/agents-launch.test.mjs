// What the agent tool registers and the child command a call produces.
import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { install } from "../../plugins/pstack/pi/index.ts";
import { chmodDeniesReads } from "../session-hook-sheets.mjs";
import { agentBody, agentEntry, fakeCtx, fakePi, flag, gitRepo, listAgents, recordWith, restore, useWorld, waitFor } from "./harness.mjs";

const setup = useWorld();

describe("agent tool", () => {
  test("a tool's prompt snippet does not repeat the name Pi already prints before it", () => {
    const { pi } = setup();
    const snippets = [...pi.tools.values()].filter((t) => t.promptSnippet);
    expect(snippets.map((t) => t.name)).toContain("agent");
    for (const t of snippets) expect(t.promptSnippet.toLowerCase().startsWith(`${t.name}:`)).toBe(false);
  });

  test("every pstack tool is model-only, so Pi declares it to the model in every codemode mode and never defers it", () => {
    const { pi } = setup();
    const exposures = Object.fromEntries([...pi.tools.values()].map((t) => [t.name, t.exposure]));
    expect(exposures).toEqual({
      agent: "model-only",
      send_message: "model-only",
      list_agents: "model-only",
      stop_agent: "model-only",
      ask_user_question: "model-only",
      schedule_wakeup: "model-only",
    });
  });

  test("readonly runs the child without the edit and write tools", async () => {
    const { w, pi, ctx } = setup();
    await pi.call("agent", { description: "r", prompt: "x", readonly: true }, ctx);
    await pi.call("agent", { description: "w", prompt: "x" }, ctx);
    const [ro, rw] = w.invocations();
    expect(flag(ro, "--exclude-tools")).toBe("edit,write");
    expect(flag(rw, "--exclude-tools")).toBeNull();
    expect(pi.tools.get("agent").parameters.properties.readonly.type).toBe("boolean");
  });

  test("agents nest at most three layers below the main session, as on Claude Code", async () => {
    const { w } = setup();
    const excludedAt = async (depth, params = {}) => {
      const pi = fakePi();
      install(pi.api, { ...w.settings, depth });
      await pi.call("agent", { description: "d", prompt: "x", ...params }, fakeCtx({ cwd: w.cwd }));
      return flag(w.invocations().at(-1), "--exclude-tools");
    };
    expect(await excludedAt(0)).toBeNull();
    expect(await excludedAt(1)).toBeNull();
    expect(await excludedAt(2)).toBe("agent");
    expect(await excludedAt(2, { readonly: true })).toBe("edit,write,agent");
  });

  test("every pstack agent type reaches its child with its own agent file as the system prompt", async () => {
    const { w, pi, ctx } = setup();
    const files = {
      "pstack:poteto-agent": "agents/poteto-agent.md",
      "pstack:comment-sicko": "agents/comment-sicko.md",
      "pstack:poteto-agent-high": "effort-agents/poteto-agent-high.md",
      "pstack:effort-low": "effort-agents/effort-low.md",
    };
    for (const type of Object.keys(files)) await pi.call("agent", { description: type, prompt: "x", subagent_type: type }, ctx);
    expect(w.invocations().map((inv) => inv.systemPrompt)).toEqual(Object.values(files).map(agentBody));
  });

  test("unknown subagent_type is an error listing every valid type", async () => {
    const { w, pi, ctx } = setup();
    const err = await pi.call("agent", { description: "x", prompt: "x", subagent_type: "poteto-agent" }, ctx).catch((e) => e);
    expect(err.message).toContain('Unknown subagent_type "poteto-agent"');
    for (const t of ["general-purpose", "pstack:poteto-agent", "pstack:comment-sicko", "pstack:effort-high", "pstack:poteto-agent-xhigh"]) {
      expect(err.message).toContain(t);
    }
    expect(w.invocations()).toEqual([]);
  });

  test("an effort agent passes its body as a 0600 system prompt file and its effort as --thinking; others run at the parent's level", async () => {
    const { w, pi, ctx } = setup();
    await pi.call("agent", { description: "e", prompt: "x", subagent_type: "pstack:effort-xhigh" }, ctx);
    await pi.call("agent", { description: "g", prompt: "x", subagent_type: "general-purpose" }, ctx);
    const [effort, general] = w.invocations();

    expect(flag(effort, "--thinking")).toBe("xhigh");
    expect(effort.systemPrompt).toBe(agentBody("effort-agents/effort-xhigh.md"));
    expect(statSync(flag(effort, "--append-system-prompt")).mode & 0o777).toBe(0o600);
    expect(flag(general, "--thinking")).toBe("medium");
    expect(flag(general, "--append-system-prompt")).toBeNull();
  });

  test("a resume whose system prompt file is gone writes it again, since pi would append the missing path as the prompt text", async () => {
    const { w, pi, ctx } = setup();
    await pi.call("agent", { description: "p", prompt: "first", subagent_type: "pstack:poteto-agent" }, ctx);
    rmSync(join(w.agentDir, "pstack", "parent-session", "prompts"), { recursive: true });
    await pi.call("send_message", { to: "p", message: "again" }, ctx);
    await waitFor(() => pi.messages.length === 1);
    const [first, second] = w.invocations();
    expect(second.systemPrompt).toBe(agentBody("agents/poteto-agent.md"));
    expect(flag(second, "--append-system-prompt")).toBe(flag(first, "--append-system-prompt"));
    expect(statSync(flag(second, "--append-system-prompt")).mode & 0o777).toBe(0o600);
  });

  test("a resume whose system prompt file is gone and whose type no longer has one fails, and no child starts", async () => {
    const { w, pi, ctx } = setup();
    await pi.call("agent", { description: "p", prompt: "first", subagent_type: "pstack:poteto-agent" }, ctx);
    rmSync(join(w.agentDir, "pstack", "parent-session", "prompts"), { recursive: true });
    const removedType = recordWith(pi.entries.at(-1).data, { agent: { subagentType: "pstack:removed" } });

    const resumed = await restore(w, [agentEntry(removedType)]);
    const err = await resumed.call("send_message", { to: "p", message: "again" }, ctx).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('its type "pstack:removed" no longer provides one');
    expect(w.invocations()).toHaveLength(1);
    expect((await listAgents(resumed, ctx)).map((a) => a.status)).toEqual(["failed"]);
  });

  test("a system prompt file that cannot be written fails the launch before a worktree or its branch is made", async () => {
    const { w, pi, ctx } = setup();
    const git = gitRepo(w.cwd);
    const state = join(w.agentDir, "pstack", "parent-session");
    mkdirSync(state, { recursive: true });
    writeFileSync(join(state, "prompts"), "a file where the prompts directory belongs");

    const err = await pi.call("agent", { description: "wt", prompt: "x", subagent_type: "pstack:poteto-agent", isolation: "worktree" }, ctx).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(git("worktree", "list").split("\n")).toHaveLength(1);
    expect(git("branch", "--list").split("\n")).toHaveLength(1);
    expect(w.invocations()).toEqual([]);
  });
});

describe("model resolution", () => {
  const modelOf = (inv) => flag(inv, "--model");

  test("alias, sheet override, inherit-parent, auto, pass-through, and no parent model", async () => {
    const { w, pi, ctx } = setup({ sheet: "default effort: session\npi models: sonnet=openai/sheet-sonnet, haiku=openai/sheet-haiku\n" });
    for (const model of ["opus", "sonnet", "inherit-parent", "auto", "openai/gpt-x", undefined]) {
      await pi.call("agent", { description: "m", prompt: "x", model }, ctx);
    }
    await pi.call("agent", { description: "m", prompt: "x" }, fakeCtx({ cwd: w.cwd, model: null }));
    expect(w.invocations().map(modelOf)).toEqual([
      "anthropic/fixture-opus",
      "openai/sheet-sonnet",
      "anthropic/parent-model",
      "anthropic/parent-model",
      "openai/gpt-x",
      "anthropic/parent-model",
      null,
    ]);
  });

  test("a family name uses the parent's provider unless the user explicitly overrides it", async () => {
    const { w, pi } = setup({ sheet: "pi models: haiku=anthropic/sheet-haiku\n" });
    const on = (provider) => fakeCtx({ cwd: w.cwd, model: { provider, id: "parent" } });
    for (const model of ["opus", "fable", "haiku"]) await pi.call("agent", { description: "m", prompt: "x", model }, on("openai-codex"));
    expect(w.invocations().map(modelOf)).toEqual([
      "openai-codex/fixture-opus",
      "openai-codex/fixture-fable",
      "anthropic/sheet-haiku",
    ]);
  });

  test.skipIf(!chmodDeniesReads)("an unreadable sheet leaves the default model until it is readable again", async () => {
    const { w, pi, ctx } = setup({ sheet: "pi models: sonnet=openai/sheet-sonnet\n" });
    const sheet = join(w.agentDir, "pstack-models.md");
    chmodSync(sheet, 0o000);
    await pi.call("agent", { description: "m", prompt: "x", model: "sonnet" }, ctx);
    chmodSync(sheet, 0o600);
    await pi.call("agent", { description: "m", prompt: "x", model: "sonnet" }, ctx);
    expect(w.invocations().map(modelOf)).toEqual(["anthropic/fixture-sonnet", "openai/sheet-sonnet"]);
  });

  test("an unknown or absent provider requires an explicit alias mapping", async () => {
    const { w, pi } = setup();
    for (const provider of ["openrouter", "constructor", undefined]) {
      const ctx = fakeCtx({ cwd: w.cwd, model: provider ? { provider, id: "parent" } : null });
      await expect(pi.call("agent", { description: "m", prompt: "x", model: "opus" }, ctx)).rejects.toThrow('No Pi model mapped for "opus"');
    }
    expect(w.invocations()).toEqual([]);
  });

  test("an explicit mapping works even when the parent provider is unlisted", async () => {
    const { w, pi } = setup({ sheet: "pi models: opus=openai/sheet-sonnet\n" });
    const ctx = fakeCtx({ cwd: w.cwd, model: { provider: "openrouter", id: "parent" } });
    await pi.call("agent", { description: "m", prompt: "x", model: "opus" }, ctx);
    expect(w.invocations().map(modelOf)).toEqual(["openai/sheet-sonnet"]);
  });

  test("an unavailable explicit model fails before creating a child", async () => {
    const { w, pi, ctx } = setup();
    ctx.modelRegistry.find = () => undefined;
    await expect(pi.call("agent", { description: "m", prompt: "x", model: "openai/unavailable" }, ctx)).rejects.toThrow('Unknown Pi model "openai/unavailable"');
    expect(w.invocations()).toEqual([]);
  });

  test("missing credentials fail before creating a child", async () => {
    const { w, pi, ctx } = setup({ ctx: { auth: "none" } });
    await expect(pi.call("agent", { description: "m", prompt: "x", model: "opus" }, ctx)).rejects.toThrow('No configured Pi credentials for "anthropic"');
    expect(w.invocations()).toEqual([]);
  });

  test.each([["foreground", false], ["background", true]])("cancellation during credential validation prevents a %s child launch", async (_mode, run_in_background) => {
    const { w, pi, ctx } = setup({ ctx: { auth: "live-check-only" } });
    let releaseCredentials;
    ctx.modelRegistry.getAvailableOfType = () => new Promise((resolve) => { releaseCredentials = resolve; });
    const controller = new AbortController();
    const attempt = pi.call("agent", { description: "cancelled", prompt: "x", run_in_background }, ctx, controller.signal);
    expect(typeof releaseCredentials).toBe("function");
    controller.abort();
    releaseCredentials([ctx.model]);
    const error = await attempt.catch((e) => e);
    expect(error.name).toBe("AbortError");
    expect(w.invocations()).toEqual([]);
    expect(await listAgents(pi, ctx)).toEqual([]);
  });

  test("an already cancelled launch does not start credential validation or a child", async () => {
    const { w, pi, ctx } = setup({ ctx: { auth: "live-check-only" } });
    let checks = 0;
    ctx.modelRegistry.getAvailableOfType = async () => { checks++; return [ctx.model]; };
    const controller = new AbortController();
    controller.abort();
    const error = await pi.call("agent", { description: "cancelled", prompt: "x" }, ctx, controller.signal).catch((e) => e);
    expect(error.name).toBe("AbortError");
    expect(checks).toBe(0);
    expect(w.invocations()).toEqual([]);
  });

  test("an unsupported explicit effort fails instead of being clamped", async () => {
    const { w, pi, ctx } = setup();
    ctx.modelRegistry.find = (provider, id) => ({ provider, id, reasoning: true, thinkingLevelMap: { xhigh: null } });
    await expect(pi.call("agent", { description: "m", prompt: "x", subagent_type: "pstack:effort-xhigh" }, ctx)).rejects.toThrow('does not support thinking level "xhigh"');
    expect(w.invocations()).toEqual([]);
  });

  test("parent inheritance preserves an unlisted provider without selecting another provider", async () => {
    const { w, pi } = setup();
    const ctx = fakeCtx({ cwd: w.cwd, model: { provider: "openrouter", id: "custom-parent" } });
    for (const model of [undefined, "auto", "inherit-parent"]) await pi.call("agent", { description: "m", prompt: "x", model }, ctx);
    expect(w.invocations().map(modelOf)).toEqual(Array(3).fill("openrouter/custom-parent"));
    expect(w.invocations().map((inv) => flag(inv, "--thinking"))).toEqual(Array(3).fill("medium"));
  });

  test("a model switch uses its native default effort unless an effort is explicit", async () => {
    const { w, pi, ctx } = setup();
    await pi.call("agent", { description: "m", prompt: "x", model: "opus" }, ctx);
    await pi.call("agent", { description: "m", prompt: "x", model: "opus", subagent_type: "pstack:effort-high" }, ctx);
    expect(w.invocations().map((inv) => flag(inv, "--thinking"))).toEqual([null, "high"]);
  });

  test.each([
    ["pstack:effort-low", { reasoning: false }],
    ["pstack:effort-max", { reasoning: true }],
    ["pstack:effort-high", { reasoning: true, thinkingLevelMap: { high: null } }],
  ])("unsupported model thinking metadata rejects %s", async (subagent_type, metadata) => {
    const { w, pi, ctx } = setup();
    ctx.modelRegistry.find = (provider, id) => ({ provider, id, ...metadata });
    await expect(pi.call("agent", { description: "m", prompt: "x", subagent_type }, ctx)).rejects.toThrow("does not support thinking level");
    expect(w.invocations()).toEqual([]);
  });

  test("an explicit effort without a selected model requests configuration", async () => {
    const { w, pi, ctx } = setup({ ctx: { model: null } });
    await expect(pi.call("agent", { description: "m", prompt: "x", subagent_type: "pstack:effort-high" }, ctx)).rejects.toThrow("without a selected Pi model");
    expect(w.invocations()).toEqual([]);
  });

  test("Pi's live availability check can authorize credentials absent from its static snapshot", async () => {
    const { w, pi, ctx } = setup({ ctx: { auth: "live-check-only" } });
    await pi.call("agent", { description: "m", prompt: "x" }, ctx);
    expect(w.invocations().map(modelOf)).toEqual(["anthropic/parent-model"]);
  });

  test("an unknown alias is an error naming the valid values", async () => {
    const { w, pi, ctx } = setup();
    const err = await pi.call("agent", { description: "m", prompt: "x", model: "opus @xhigh" }, ctx).catch((e) => e);
    expect(err.message).toContain('Unknown model "opus @xhigh"');
    expect(err.message).toContain("opus, fable, sonnet, haiku, inherit-parent, auto");
    expect(w.invocations()).toEqual([]);
  });
});
