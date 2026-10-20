#!/usr/bin/env node
// A real local CLI/API/UI fixture, with one SQLite database per instance.
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { join } from "node:path";

const [command, directory, value, head] = process.argv.slice(2);
const db = new DatabaseSync(join(directory, "items.sqlite"));
db.exec("CREATE TABLE IF NOT EXISTS items (value TEXT NOT NULL)");
const items = () =>
  db
    .prepare("SELECT value FROM items ORDER BY rowid")
    .all()
    .map((row) => row.value);
const add = (value) =>
  db.prepare("INSERT INTO items (value) VALUES (?)").run(value);
if (command === "add") {
  add(value);
  console.log(JSON.stringify({ added: value }));
  db.close();
} else if (command === "list") {
  console.log(JSON.stringify(items()));
  db.close();
} else if (command === "serve") {
  const page = `<!doctype html><html><head><title>Verification fixture</title></head>
<body><h1>Items</h1><label>New item <input aria-label="New item"></label><button>Save</button><ul></ul>
<script>
const input = document.querySelector('input');
async function refresh() {
  const items = await (await fetch('/items')).json();
  document.querySelector('ul').replaceChildren(...items.map(value => {
    const li = document.createElement('li'); li.textContent = value; return li;
  }));
}
document.querySelector('button').onclick = async () => {
  await fetch('/items', {method:'POST', body:JSON.stringify({value:input.value})});
  localStorage.setItem('lastItem', input.value); await refresh();
};
refresh().then(() => window.appReady = true);
</script></body></html>`;
  const server = createServer(async (req, res) => {
    const json = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.url === "/meta")
      return json(200, { owner: value, head, pid: process.pid });
    if (req.url === "/items" && req.method === "GET") return json(200, items());
    if (req.url === "/items" && req.method === "POST") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      let item;
      try {
        item = JSON.parse(raw).value;
      } catch {}
      if (typeof item !== "string" || !item.trim())
        return json(422, { error: "value is required" });
      add(item);
      return json(201, { added: item });
    }
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(page);
    }
    json(404, { error: "not found" });
  });
  server.listen(0, "127.0.0.1", () =>
    console.log(JSON.stringify({ port: server.address().port })),
  );
} else {
  console.error(
    "Usage: app.mjs add|list|serve <data-dir> [value/owner] [head]",
  );
  process.exitCode = 2;
}
