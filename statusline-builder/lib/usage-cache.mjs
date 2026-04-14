import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import https from "node:https";

const DEFAULT_CACHE_PATH = join(homedir(), ".claude", ".statusline-usage-cache.json");
const DEFAULT_TTL = 60;

export function defaultCachePath() {
  return DEFAULT_CACHE_PATH;
}

export function readUsageCache(path = DEFAULT_CACHE_PATH) {
  try {
    if (!existsSync(path)) return null;
    const obj = JSON.parse(readFileSync(path, "utf-8"));
    if (typeof obj.timestamp !== "number") return null;
    return obj;
  } catch {
    return null;
  }
}

export function writeUsageCache(path = DEFAULT_CACHE_PATH, data) {
  const entry = { timestamp: Math.floor(Date.now() / 1000), data };
  const tmp = `${path}.tmp.${process.pid}`;
  try {
    writeFileSync(tmp, JSON.stringify(entry, null, 2));
    renameSync(tmp, path);
  } catch {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch {}
  }
}

export function isCacheFresh(cache, ttlSec = DEFAULT_TTL) {
  if (!cache || typeof cache.timestamp !== "number") return false;
  const age = Math.floor(Date.now() / 1000) - cache.timestamp;
  return age < ttlSec;
}

function readKeychainToken() {
  if (process.platform !== "darwin") return null;
  try {
    const raw = execFileSync(
      "/usr/bin/security",
      ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
      { encoding: "utf-8", timeout: 2000, stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

function readFileToken() {
  const p = join(homedir(), ".claude", ".credentials.json");
  try {
    if (!existsSync(p)) return null;
    const parsed = JSON.parse(readFileSync(p, "utf-8"));
    return parsed.claudeAiOauth?.accessToken ?? parsed.accessToken ?? null;
  } catch {
    return null;
  }
}

export function getOauthToken() {
  return readKeychainToken() || readFileToken();
}

/**
 * Fetch usage synchronously via https. Returns parsed JSON on success,
 * null on any failure. Times out after 8 seconds.
 */
export function fetchUsage(token) {
  return new Promise((resolve) => {
    if (!token) return resolve(null);
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/api/oauth/usage",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "anthropic-beta": "oauth-2025-04-20",
          "Content-Type": "application/json",
        },
        timeout: 8000,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode !== 200) return resolve(null);
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Spawn a detached child process that refreshes the cache in background,
 * so the statusline render never waits on network. The child imports
 * this same module and calls fetch+write itself.
 */
export function spawnBackgroundRefresh(cachePath = DEFAULT_CACHE_PATH) {
  try {
    const refreshScript = new URL("./usage-cache-refresh.mjs", import.meta.url).pathname;
    spawn(process.execPath, [refreshScript, cachePath], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } catch {
    // best-effort only
  }
}
