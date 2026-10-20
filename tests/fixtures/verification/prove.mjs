#!/usr/bin/env node
// Project-specific fixture driver. Evidence survives success and failed-drive cleanup.
import assert from "node:assert/strict";
import { headlessBrowser } from "./browser.mjs";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

const [checkoutA, checkoutB, evidence] = process.argv.slice(2);
assert.ok(
  checkoutA && checkoutB && evidence,
  "prove.mjs <checkout-a> <checkout-b> <evidence>",
);
const browser = headlessBrowser();
mkdirSync(evidence, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), "pstack-proof-state-"));
const processes = [],
  sockets = [],
  receipts = [];
const save = (path, value) =>
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
async function until(read) {
  const deadline = Date.now() + 10000;
  let last;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (result) return result;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw last ?? Error("fixture did not reach usable state");
}
function launch(exe, args, cwd, log) {
  const child = spawn(exe, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
  processes.push(child);
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
    writeFileSync(log + ".stdout", output);
  });
  let errors = "";
  child.stderr.on("data", (chunk) => {
    errors += chunk;
    writeFileSync(log + ".stderr", errors);
  });
  child.on("error", (error) => {
    errors += error.message;
    writeFileSync(log + ".stderr", errors);
  });
  return { child, output: () => output };
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await until(() => child.exitCode !== null || child.signalCode !== null).catch(
    async () => {
      child.kill("SIGKILL");
      await until(() => child.exitCode !== null || child.signalCode !== null);
    },
  );
}
async function cdp(profile, checkout, log) {
  const { child } = launch(
    browser,
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    checkout,
    log,
  );
  const port = await until(
    () =>
      existsSync(join(profile, "DevToolsActivePort")) &&
      readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0],
  );
  const pages = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  const ws = new WebSocket(
    pages.find((page) => page.type === "page").webSocketDebuggerUrl,
  );
  sockets.push(ws);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let serial = 0;
  const pending = new Map(),
    actions = [];
  ws.onmessage = (event) => {
    const result = JSON.parse(event.data),
      handler = pending.get(result.id);
    if (!handler) return;
    pending.delete(result.id);
    clearTimeout(handler.timeout);
    result.error
      ? handler.reject(Error(JSON.stringify(result.error)))
      : handler.resolve(result.result);
  };
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++serial;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(Error(`CDP timeout ${method}`));
      }, 5000);
      pending.set(id, { resolve, reject, timeout });
      if (
        method !== "Runtime.evaluate" ||
        !params.expression.includes("appReady")
      )
        actions.push({ method, params });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails)
      throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  return { child, call, evaluate, actions, port };
}
async function lane(checkout, owner) {
  const directory = join(scratch, owner),
    artifacts = join(evidence, owner);
  mkdirSync(directory);
  mkdirSync(artifacts);
  const app = join(checkout, "app.mjs");
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: checkout,
    encoding: "utf8",
  }).trim();
  const cli = (command, value) => {
    const args = [app, command, directory, ...(value ? [value] : [])];
    const result = spawnSync(process.execPath, args, {
      cwd: checkout,
      encoding: "utf8",
    });
    const receipt = {
      command: [process.execPath, ...args],
      cwd: checkout,
      head,
      stdout: result.stdout,
      stderr: result.stderr,
      exitStatus: result.status,
    };
    save(join(artifacts, `cli-${command}.json`), receipt);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  assert.deepEqual(cli("add", `cli-${owner}`), { added: `cli-${owner}` });
  const args = [app, "serve", directory, owner, head];
  const server = launch(
    process.execPath,
    args,
    checkout,
    join(artifacts, "server"),
  );
  const port = await until(
    () =>
      server.output().includes("\n") &&
      JSON.parse(server.output().split("\n")[0]).port,
  );
  const url = `http://127.0.0.1:${port}`;
  const requests = [];
  const request = async (path, init = {}) => {
    const response = await fetch(url + path, init);
    const body = await response.json();
    requests.push({
      request: {
        url: url + path,
        method: init.method ?? "GET",
        body: init.body,
      },
      response: {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body,
      },
    });
    save(join(artifacts, "responses.json"), requests);
    return { status: response.status, body };
  };
  assert.deepEqual((await request("/meta")).body, {
    owner,
    head,
    pid: server.child.pid,
  });
  assert.deepEqual((await request("/items")).body, [`cli-${owner}`]);
  assert.equal(
    (
      await request("/items", {
        method: "POST",
        body: JSON.stringify({ value: `api-${owner}` }),
      })
    ).status,
    201,
  );
  assert.deepEqual(cli("list"), [`cli-${owner}`, `api-${owner}`]);
  const profile = join(directory, "browser-profile");
  const ui = await cdp(profile, checkout, join(artifacts, "browser"));
  await ui.call("Page.enable");
  await ui.call("Page.navigate", { url });
  await until(() => ui.evaluate("window.appReady === true"));
  await ui.evaluate("document.querySelector('input').focus()");
  await ui.call("Input.insertText", { text: `ui-${owner}` });
  const point = await ui.evaluate(
    "(()=>{const r=document.querySelector('button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()",
  );
  await ui.call("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    clickCount: 1,
    ...point,
  });
  await ui.call("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    clickCount: 1,
    ...point,
  });
  const expected = [`cli-${owner}`, `api-${owner}`, `ui-${owner}`];
  await until(
    async () =>
      (
        await ui.evaluate(
          "Array.from(document.querySelectorAll('li'),li=>li.textContent)",
        )
      ).join() === expected.join(),
  );
  assert.equal(
    await ui.evaluate("localStorage.getItem('lastItem')"),
    `ui-${owner}`,
  );
  assert.deepEqual(cli("list"), expected);
  const image = await ui.call("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(artifacts, "ui.png"), Buffer.from(image.data, "base64"));
  save(join(artifacts, "browser-actions.json"), ui.actions);
  const receipt = {
    owner,
    checkout,
    head,
    appSha256: createHash("sha256").update(readFileSync(app)).digest("hex"),
    launch: [process.execPath, ...args],
    pid: server.child.pid,
    port,
    browserPid: ui.child.pid,
    browserPort: ui.port,
    profile,
    database: join(directory, "items.sqlite"),
    uiExpected: [...expected],
    expected,
    artifacts,
    outcome: "observed",
  };
  receipts.push(receipt);
  save(join(artifacts, "receipt.json"), receipt);
  return {
    directory,
    artifacts,
    server,
    request,
    cli,
    ui,
    expected,
    receipt,
    url,
  };
}
let outcome = "failed",
  failure;
try {
  const a = await lane(checkoutA, "A"),
    b = await lane(checkoutB, "B");
  assert.notEqual(a.receipt.port, b.receipt.port);
  assert.notEqual(a.receipt.database, b.receipt.database);
  assert.notEqual(a.receipt.profile, b.receipt.profile);
  // Both servers are alive and write at the same time, through their public API.
  await Promise.all(
    [a, b].map(async (lane) => {
      const item = `parallel-${lane.receipt.owner}`;
      assert.equal(
        (
          await lane.request("/items", {
            method: "POST",
            body: JSON.stringify({ value: item }),
          })
        ).status,
        201,
      );
      lane.expected.push(item);
      assert.deepEqual(lane.cli("list"), lane.expected);
      save(join(lane.artifacts, "receipt.json"), lane.receipt);
    }),
  );
  // A failed real request must keep partial evidence and release only its own resources.
  const failed = await a.request("/items", { method: "POST", body: "{}" });
  assert.equal(failed.status, 422);
  assert.deepEqual(failed.body, { error: "value is required" });
  assert.deepEqual(a.cli("list"), a.expected);
  await stop(a.ui.child);
  await stop(a.server.child);
  rmSync(a.directory, { recursive: true, force: true });
  await assert.rejects(fetch(a.url + "/items"));
  assert.deepEqual((await b.request("/items")).body, b.expected);
  assert.deepEqual(b.cli("list"), b.expected);
  assert.equal(await b.ui.evaluate("localStorage.getItem('lastItem')"), "ui-B");
  for (const file of ["responses.json", "ui.png", "receipt.json"])
    assert.ok(existsSync(join(a.artifacts, file)));
  outcome = "passed";
} catch (error) {
  failure = error.stack;
  throw error;
} finally {
  for (const socket of sockets) socket.close();
  for (const child of processes.toReversed()) await stop(child);
  rmSync(scratch, { recursive: true, force: true });
  save(join(evidence, "summary.json"), {
    outcome,
    failure,
    receipts,
    processExit: processes.map((child) => ({
      pid: child.pid,
      exitCode: child.exitCode,
      signal: child.signalCode,
    })),
    scratchRemoved: !existsSync(scratch),
  });
}
console.log(JSON.stringify({ outcome, evidence, receipts: receipts.length }));
