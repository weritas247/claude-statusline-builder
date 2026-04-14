import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readUsageCache, writeUsageCache, isCacheFresh } from "../lib/usage-cache.mjs";

test("readUsageCache returns null when file missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-uc-"));
  const path = join(dir, "cache.json");
  assert.equal(readUsageCache(path), null);
  rmSync(dir, { recursive: true, force: true });
});

test("writeUsageCache then readUsageCache roundtrips", () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-uc-"));
  const path = join(dir, "cache.json");
  const data = { five_hour: { utilization: 30.0, resets_at: "2026-04-14T10:00:00Z" } };
  writeUsageCache(path, data);
  assert.ok(existsSync(path));
  const got = readUsageCache(path);
  assert.equal(got.data.five_hour.utilization, 30);
  assert.ok(typeof got.timestamp === "number");
  rmSync(dir, { recursive: true, force: true });
});

test("isCacheFresh respects TTL", () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(isCacheFresh({ timestamp: now - 30 }, 60), true);
  assert.equal(isCacheFresh({ timestamp: now - 90 }, 60), false);
  assert.equal(isCacheFresh(null, 60), false);
});
