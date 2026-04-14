import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONFIG } from "../lib/default-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNTIME = join(__dirname, "..", "..", "statusline.mjs");

let tmpDir;
let fixtureConfigPath;

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sl-e2e-"));
  fixtureConfigPath = join(tmpDir, "statusline.json");
  writeFileSync(fixtureConfigPath, JSON.stringify(DEFAULT_CONFIG));
});

after(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function runRuntime(stdinJson) {
  const r = spawnSync("node", [RUNTIME], {
    input: JSON.stringify(stdinJson),
    encoding: "utf-8",
    timeout: 3000,
    env: { ...process.env, STATUSLINE_CONFIG_PATH: fixtureConfigPath },
  });
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
}

test("runtime produces at least one non-empty output line for default config", () => {
  const stdin = {
    model: { display_name: "Opus 4.6 (1M context)" },
    version: "2.1.105",
    cwd: process.cwd(),
    cost: { total_cost_usd: 1.5, total_duration_ms: 120000, total_api_duration_ms: 30000, total_lines_added: 10, total_lines_removed: 2 },
    context_window: { used_percentage: 15, context_window_size: 1000000 },
    rate_limits: { five_hour: { used_percentage: 10, resets_at: 0 }, seven_day: { used_percentage: 50, resets_at: 0 } }
  };
  const r = runRuntime(stdin);
  assert.equal(r.status, 0, `runtime exited ${r.status}, stderr: ${r.stderr}`);
  const lines = r.stdout.split("\n").filter(Boolean);
  assert.ok(lines.length >= 1, "at least 1 output line");
  // Some known elements should appear
  assert.ok(r.stdout.includes("Opus"), "includes model name");
});

test("runtime tolerates minimal stdin", () => {
  const r = runRuntime({});
  assert.equal(r.status, 0);
  assert.ok(r.stdout.length > 0);
});
