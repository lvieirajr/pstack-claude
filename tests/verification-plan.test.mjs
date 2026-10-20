import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mode = join(import.meta.dir, "../plugins/pstack/skills/poteto-mode");
const template = readFileSync(
  join(mode, "playbooks/multi-phase-plan.md"),
  "utf8",
).match(/^````markdown\n([\s\S]*?)^````$/m)[1];
const rule =
  "Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.";

function plan({
  count = 10,
  decision = "",
  surface = "cli",
  artifact = "transcript",
  gate,
  lanes,
} = {}) {
  const live =
    `**Verify, live.** ${rule} Required lanes \`${count}\` at the PR head on the configured \`swarm workers\` model.${decision ? ` Lane decision \`${decision}\`.` : ""}\n\n` +
    (lanes ??
      Array.from(
        { length: count },
        (_, i) =>
          `- [ ] Lane ${i + 1}. ${i === 0 ? "Regression lane against trunk. " : ""}Surface \`${surface}\`. Run \`node scripts/verify.mjs lane-${i + 1}\`. Artifact \`${artifact}\`. Save \`proof/lane-${i + 1}.${surface === "ui" ? "png" : "json"}\`. Pass when the user's saved item is returned by the real surface.`,
      ).join("\n"));
  const review =
    gate ??
    "**Review gate.** The operator reviews before merge.\n\n- [ ] Post lane artifacts and reproduction commands for operator review. Stop at merge-ready until approved.";
  return template
    .replace(
      /\*\*Verify, live\.\*\*[\s\S]*?(?=\*\*Verify, perf\.\*\*)/,
      live + "\n\n",
    )
    .replace(
      /\*\*Review gate\.\*\*[\s\S]*?(?=\*\*Merge\.\*\*)/,
      review + "\n\n",
    );
}

function run(body, args = ["--runtime", "codex"]) {
  const dir = mkdtempSync(join(tmpdir(), "pstack-proof-plan-"));
  try {
    const file = join(dir, "plan.md");
    writeFileSync(file, body);
    const result = spawnSync(
      "node",
      [join(mode, "scripts/check-plan.mjs"), file, ...args],
      { encoding: "utf8", timeout: 20000 },
    );
    return { code: result.status, out: result.stdout + result.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const runtime of ["claude", "codex"]) {
  describe(`${runtime} proof contracts`, () => {
    const check = (body) => run(body, ["--runtime", runtime]);
    test("CLI transcripts and API responses need no screen recording", () => {
      expect(check(plan()).code).toBe(0);
      expect(check(plan({ surface: "api", artifact: "response" })).code).toBe(
        0,
      );
    });
    test("UI evidence keeps the screenshot, video and operator gate", () => {
      const ui = { surface: "ui", artifact: "screenshot" };
      expect(check(plan(ui)).out).toContain('Review gate lacks "screenshot"');
      expect(
        check(
          plan({
            ...ui,
            gate: "**Review gate.** The operator reviews before merge.\n\n- [ ] Post lane screenshot artifacts and a video for the operator. Wait for approval.",
          }),
        ).code,
      ).toBe(0);
    });
    test("capacity does not remove required logical lanes", () => {
      const result = check(plan().replace(/^- \[ \] Lane 10\..*\n/m, ""));
      expect(result.code).toBe(1);
      expect(result.out).toContain("expected 1 to 10");
    });
    test("a deliberately selected lane count requires its decision source", () => {
      expect(check(plan({ count: 3 })).out).toContain("Lane decision");
      expect(
        check(
          plan({
            count: 3,
            decision: "AGENTS.md verification policy, three distinct journeys",
          }),
        ).code,
      ).toBe(0);
      expect(check(plan({ count: 0, decision: "chat approved" })).code).toBe(1);
    });
    test("configured worker routing remains mandatory", () => {
      const result = check(
        plan().replace("on the configured `swarm workers` model", ""),
      );
      expect(result.code).toBe(1);
      expect(result.out).toContain("configured swarm workers model");
    });
    test("lane numbers are unique and contiguous", () => {
      const result = check(plan().replace("Lane 10.", "Lane 9."));
      expect(result.code).toBe(1);
      expect(result.out).toContain("expected 1 to 10");
    });
    for (const [name, pattern, replacement, problem] of [
      ["surface", /Surface `cli`\./, "", "Surface"],
      ["drive", /Run `node scripts\/verify.mjs lane-1`\./, "", "Run"],
      [
        "artifact type",
        /Artifact `transcript`\./,
        "Artifact `screenshot`.",
        "artifact",
      ],
      ["artifact path", /Save `proof\/lane-1.json`\./, "", "artifact"],
      [
        "predicate",
        /Pass when the user's saved item is returned by the real surface\./,
        "Pass when .",
        "pass predicate",
      ],
      [
        "placeholder",
        /Run `node scripts\/verify.mjs lane-1`/,
        "Run `<command>`",
        "Run",
      ],
      [
        "regression",
        /Regression lane against trunk\. /,
        "",
        "Regression lane against trunk",
      ],
    ])
      test(`missing or invalid ${name} fails`, () => {
        const result = check(plan().replace(pattern, replacement));
        expect(result.code).toBe(1);
        expect(result.out).toContain(problem);
      });
    test("fenced examples cannot supply native proof fields", () => {
      const body =
        plan().replace("Run `node scripts/verify.mjs lane-1`.", "") +
        "\n```md\nRun `node scripts/verify.mjs lane-1`.\n```\n";
      expect(check(body).code).toBe(1);
    });
    test("None review gates name the reason", () => {
      expect(check(plan({ gate: "**Review gate.** None." })).code).toBe(1);
      expect(
        check(
          plan({
            gate: "**Review gate.** None. No interaction or operator-gated change.",
          }),
        ).code,
      ).toBe(0);
    });
    test("native mode rejects an unconverted screenshot template", () => {
      expect(check(template).code).toBe(1);
    });
  });
}

test("inherited plan validation keeps its original contract", () => {
  expect(run(template, []).code).toBe(0);
  expect(run(plan(), []).code).toBe(1);
});

test("runtime flag rejects unsupported or incomplete invocations", () => {
  for (const args of [
    ["--runtime"],
    ["--runtime", "pi"],
    ["--runtime", "codex", "--typo"],
  ])
    expect(run(plan(), args).code).toBe(2);
});
