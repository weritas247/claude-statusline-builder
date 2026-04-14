import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../lib/config.mjs";
import { DEFAULT_CONFIG } from "../lib/default-config.mjs";

test("missing file returns the default config", () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-cfg-"));
  const path = join(dir, "statusline.json");
  const cfg = loadConfig(path);
  assert.deepEqual(cfg, DEFAULT_CONFIG);
  rmSync(dir, { recursive: true, force: true });
});

test("valid file is returned as-is", () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-cfg-"));
  const path = join(dir, "statusline.json");
  const mine = { version: 1, lines: [{ style: "plain", elements: [{ type: "cost" }] }] };
  writeFileSync(path, JSON.stringify(mine));
  const cfg = loadConfig(path);
  assert.deepEqual(cfg, mine);
  rmSync(dir, { recursive: true, force: true });
});

test("malformed JSON falls back to default", () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-cfg-"));
  const path = join(dir, "statusline.json");
  writeFileSync(path, "{ not json");
  const cfg = loadConfig(path);
  assert.deepEqual(cfg, DEFAULT_CONFIG);
  rmSync(dir, { recursive: true, force: true });
});

test("wrong schema (missing lines) falls back to default", () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-cfg-"));
  const path = join(dir, "statusline.json");
  writeFileSync(path, JSON.stringify({ version: 1 }));
  const cfg = loadConfig(path);
  assert.deepEqual(cfg, DEFAULT_CONFIG);
  rmSync(dir, { recursive: true, force: true });
});
