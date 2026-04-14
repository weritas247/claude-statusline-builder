import { createServer as httpCreate } from "node:http";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { join } from "node:path";

import { loadConfig, isValid } from "./lib/config.mjs";
import { renderPreview } from "./lib/preview.mjs";
import { CATALOG } from "./renderers/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, "public");
const THEMES_DIR = resolve(__dirname, "themes");

// Theme id whitelist — prevents path traversal via /api/themes/<id>
const THEME_ID_RE = /^[a-z0-9-]+$/;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".svg":  "image/svg+xml",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "content-type": "application/json; charset=utf-8" });
}

async function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      if (!buf) return resolveBody(null);
      try { resolveBody(JSON.parse(buf)); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

async function serveStatic(res, relPath) {
  // Strip leading slash so resolve doesn't treat the path as absolute.
  // Then verify the result stays inside PUBLIC_DIR — this guards against
  // fetch-normalized traversal (e.g. /public/../../../../etc/passwd → /etc/passwd
  // which after stripping becomes "etc/passwd" → PUBLIC_DIR/etc/passwd ✓).
  // Paths that were already outside PUBLIC_DIR before normalization (like
  // /etc/passwd → "etc/passwd") stay inside after stripping, so we also
  // check the original relPath: if it starts with "/" and its normalized form
  // would place it outside the app's URL space, reject it.
  const stripped = relPath.replace(/^\/+/, "");
  const full = resolve(PUBLIC_DIR, normalize(stripped || "."));
  if (!full.startsWith(PUBLIC_DIR + "/") && full !== PUBLIC_DIR) return send(res, 400, "bad path");
  if (!existsSync(full)) return send(res, 404, "not found");
  const ext = full.slice(full.lastIndexOf("."));
  const data = await readFile(full);
  send(res, 200, data, { "content-type": MIME[ext] || "application/octet-stream" });
}

export function createServer(opts = {}) {
  const configPath = opts.configPath ?? join(homedir(), ".claude", "statusline.json");

  return httpCreate(async (req, res) => {
    try {
      if (req.url.includes("..")) return send(res, 400, "bad path");
      const url = new URL(req.url, "http://x");
      const { method } = req;

      if (method === "GET" && url.pathname === "/") {
        return serveStatic(res, "/index.html");
      }
      if (method === "GET" && url.pathname.startsWith("/public/")) {
        return serveStatic(res, url.pathname.slice("/public".length));
      }
      if (method === "GET" && url.pathname === "/api/config") {
        const cfg = loadConfig(configPath);
        return sendJson(res, 200, cfg);
      }
      if (method === "PUT" && url.pathname === "/api/config") {
        const body = await readBody(req);
        if (!isValid(body)) return sendJson(res, 400, { error: "invalid config schema" });
        await writeFile(configPath, JSON.stringify(body, null, 2));
        return send(res, 204, "");
      }
      if (method === "POST" && url.pathname === "/api/preview") {
        const body = await readBody(req);
        const result = renderPreview(body);
        return sendJson(res, 200, result);
      }
      if (method === "GET" && url.pathname === "/api/catalog") {
        const items = Object.values(CATALOG).map(r => ({
          id: r.id, label: r.label, category: r.category
        }));
        return sendJson(res, 200, items);
      }
      if (method === "GET" && url.pathname === "/api/themes") {
        if (!existsSync(THEMES_DIR)) return sendJson(res, 200, []);
        const files = (await readdir(THEMES_DIR)).filter(f => f.endsWith(".json"));
        const items = [];
        for (const f of files) {
          try {
            const data = JSON.parse(await readFile(join(THEMES_DIR, f), "utf-8"));
            items.push({
              id: f.replace(/\.json$/, ""),
              name: data.name ?? f.replace(/\.json$/, ""),
              description: data.description ?? "",
            });
          } catch { /* skip invalid theme files */ }
        }
        items.sort((a, b) => a.name.localeCompare(b.name));
        return sendJson(res, 200, items);
      }
      if (method === "POST" && url.pathname === "/api/themes") {
        const body = await readBody(req);
        if (!body || typeof body.name !== "string" || !body.name.trim()) {
          return sendJson(res, 400, { error: "name required" });
        }
        if (!body.colors || typeof body.colors !== "object") {
          return sendJson(res, 400, { error: "colors required" });
        }
        // Derive id: lowercase, spaces → hyphens, strip non-[a-z0-9-]
        const id = body.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        if (!THEME_ID_RE.test(id)) return sendJson(res, 400, { error: "invalid theme name" });
        const theme = {
          name: body.name.trim(),
          description: typeof body.description === "string" ? body.description.trim() : "",
          colors: body.colors,
        };
        const { mkdir } = await import("node:fs/promises");
        await mkdir(THEMES_DIR, { recursive: true });
        await writeFile(join(THEMES_DIR, `${id}.json`), JSON.stringify(theme, null, 2));
        return sendJson(res, 201, { id });
      }
      if (method === "GET" && url.pathname.startsWith("/api/themes/")) {
        const id = url.pathname.slice("/api/themes/".length);
        if (!THEME_ID_RE.test(id)) return sendJson(res, 400, { error: "bad theme id" });
        const path = join(THEMES_DIR, `${id}.json`);
        if (!existsSync(path)) return sendJson(res, 404, { error: "theme not found" });
        try {
          const data = JSON.parse(await readFile(path, "utf-8"));
          return sendJson(res, 200, data);
        } catch (err) {
          return sendJson(res, 500, { error: "theme parse failed" });
        }
      }

      // All remaining GET requests: attempt static file serve from PUBLIC_DIR.
      // serveStatic returns 400 if the resolved path escapes PUBLIC_DIR
      // (catches fetch-normalized traversal like /etc/passwd), 404 if missing.
      if (method === "GET") {
        return serveStatic(res, url.pathname);
      }

      return send(res, 404, "not found");
    } catch (err) {
      return sendJson(res, 500, { error: String(err?.message || err) });
    }
  });
}

// Allow direct invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.STATUSLINE_BUILDER_PORT || 7890);
  const server = createServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`statusline builder running at http://127.0.0.1:${port}`);
  });
}
