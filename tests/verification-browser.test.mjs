import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { headlessBrowser } from "./fixtures/verification/browser.mjs";

test("no browser is selected implicitly", () => {
  expect(() => headlessBrowser({})).toThrow(
    "no desktop browser is launched by default",
  );
});
test("desktop Chrome is rejected before launch", () => {
  expect(() =>
    headlessBrowser({
      PSTACK_BROWSER:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    }),
  ).toThrow("not desktop Chrome");
});
test("missing dedicated browser is reported without launching a process", () => {
  expect(() =>
    headlessBrowser({
      PSTACK_BROWSER: "/nonexistent/pstack-fixture/chrome-headless-shell",
    }),
  ).toThrow("does not exist");
});
test("an explicitly selected headless shell path resolves without executing it", () => {
  const root = mkdtempSync(join(tmpdir(), "pstack-browser-preflight-"));
  try {
    const browser = join(root, "chrome-headless-shell");
    writeFileSync(browser, "This is a preflight-only fixture, never executed.");
    expect(headlessBrowser({ PSTACK_BROWSER: browser })).toBe(browser);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
