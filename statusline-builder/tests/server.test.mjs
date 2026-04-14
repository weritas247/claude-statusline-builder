import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../server.mjs";

let server;
let baseUrl;
let tmpConfigPath;

before(async () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-server-"));
  tmpConfigPath = join(dir, "statusline.json");
  server = createServer({ configPath: tmpConfigPath, port: 0 });
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((res) => server.close(res));
});

async function req(method, path, body) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return fetch(baseUrl + path, init);
}

test("GET / serves the builder HTML", async () => {
  const r = await req("GET", "/");
  assert.equal(r.status, 200);
  const body = await r.text();
  assert.match(body, /<html/i);
});

test("GET /api/config returns default when file missing", async () => {
  const r = await req("GET", "/api/config");
  assert.equal(r.status, 200);
  const cfg = await r.json();
  assert.ok(Array.isArray(cfg.lines));
});

test("PUT /api/config writes a valid config", async () => {
  const next = {
    version: 1,
    lines: [{ style: "plain", elements: [{ type: "cost" }] }],
  };
  const r = await req("PUT", "/api/config", next);
  assert.equal(r.status, 204);
  const onDisk = JSON.parse(readFileSync(tmpConfigPath, "utf-8"));
  assert.deepEqual(onDisk, next);
});

test("PUT /api/config rejects invalid body with 400", async () => {
  const r = await req("PUT", "/api/config", { version: 1 });
  assert.equal(r.status, 400);
});

test("POST /api/preview returns html + ansi", async () => {
  const cfg = {
    version: 1,
    lines: [{ style: "plain", elements: [{ type: "model" }] }],
  };
  const r = await req("POST", "/api/preview", cfg);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.ok(body.html.includes("Opus"));
  assert.ok(body.ansi.includes("Opus"));
});

test("GET /api/catalog returns 17 element entries", async () => {
  const r = await req("GET", "/api/catalog");
  assert.equal(r.status, 200);
  const items = await r.json();
  assert.equal(items.length, 17);
  assert.ok(items.every(i => i.id && i.label && i.category));
});

test("path traversal is rejected", async () => {
  // fetch() normalizes ../.. on the client side, so use raw TCP
  // to verify the server's own protection against literal `..` path segments.
  const net = await import("node:net");
  const url = new URL(baseUrl);
  const port = Number(url.port);
  const status = await new Promise((resolveStatus, reject) => {
    const sock = net.createConnection({ host: "127.0.0.1", port }, () => {
      sock.write("GET /public/../../../../etc/passwd HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n");
    });
    let body = "";
    sock.on("data", (chunk) => { body += chunk.toString("utf-8"); });
    sock.on("end", () => {
      // Status line is "HTTP/1.1 NNN ..."
      const m = /^HTTP\/1\.\d (\d{3})/.exec(body);
      resolveStatus(m ? Number(m[1]) : 0);
    });
    sock.on("error", reject);
  });
  assert.equal(status, 400);
});

test("unknown route 404", async () => {
  const r = await req("GET", "/no-such-thing");
  assert.equal(r.status, 404);
});

test("GET /api/themes lists 6 preset themes with name + description", async () => {
  const r = await req("GET", "/api/themes");
  assert.equal(r.status, 200);
  const items = await r.json();
  assert.ok(Array.isArray(items));
  assert.equal(items.length, 6);
  assert.ok(items.every(i => i.id && i.name && typeof i.description === "string"));
  // Sorted alphabetically by name
  const names = items.map(i => i.name);
  assert.deepEqual([...names].sort(), names);
});

test("GET /api/themes/tokyo-night returns full theme data", async () => {
  const r = await req("GET", "/api/themes/tokyo-night");
  assert.equal(r.status, 200);
  const theme = await r.json();
  assert.equal(theme.name, "Tokyo Night");
  assert.ok(theme.colors.user.bg.startsWith("#"));
  assert.ok(theme.colors.user.fg.startsWith("#"));
});

test("GET /api/themes/<bad id> rejects invalid characters", async () => {
  // uppercase + space not in /^[a-z0-9-]+$/
  const r = await req("GET", "/api/themes/Bad%20Name");
  assert.equal(r.status, 400);
});

test("GET /api/themes/nonexistent returns 404", async () => {
  const r = await req("GET", "/api/themes/nonexistent");
  assert.equal(r.status, 404);
});
