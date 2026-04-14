import { test } from "node:test";
import assert from "node:assert/strict";
import contextBar from "../renderers/context-bar.mjs";
import rateLimits from "../renderers/rate-limits.mjs";
import { MOCK_STDIN } from "../lib/mock-data.mjs";

test("context-bar shows filled blocks and percent", () => {
  const r = contextBar.render(MOCK_STDIN, { width: 20 });
  // 16% of 20 = 3 filled, 17 empty
  const filled = (r.ansi.match(/█/g) || []).length;
  const empty  = (r.ansi.match(/░/g) || []).length;
  assert.equal(filled, 3);
  assert.equal(empty, 17);
  assert.ok(r.ansi.includes("16%"));
});

test("context-bar clamps width", () => {
  const r = contextBar.render({ ...MOCK_STDIN, context: { ...MOCK_STDIN.context, percent: 100 } }, { width: 10 });
  assert.equal((r.ansi.match(/█/g) || []).length, 10);
});

test("rate-limits shows requested segments with OAuth data", () => {
  const oauth = {
    five_hour:        { utilization: 23.0, resets_at: 0 },
    seven_day:        { utilization: 89.0, resets_at: 0 },
    seven_day_sonnet: { utilization: 4.0,  resets_at: 0 },
  };
  const r = rateLimits.render(MOCK_STDIN, { show: ["5h", "wk", "sn"] }, { usage: oauth });
  assert.ok(r.ansi.includes("5h:"));
  assert.ok(r.ansi.includes("23%"));
  assert.ok(r.ansi.includes("wk:"));
  assert.ok(r.ansi.includes("89%"));
  assert.ok(r.ansi.includes("sn:"));
  assert.ok(r.ansi.includes("4%"));
});

test("rate-limits falls back to stdin rate_limits when oauth missing", () => {
  const r = rateLimits.render(MOCK_STDIN, { show: ["5h", "wk"] }, { usage: null });
  // MOCK_STDIN.rateLimits.fiveHour.percent is 23, sevenDay.percent is 89
  assert.ok(r.ansi.includes("5h:"));
  assert.ok(r.ansi.includes("23%"));
  assert.ok(r.ansi.includes("wk:"));
  assert.ok(r.ansi.includes("89%"));
});

test("rate-limits hides sn when not in config.show", () => {
  const oauth = { five_hour: { utilization: 10 }, seven_day: { utilization: 10 }, seven_day_sonnet: { utilization: 50 } };
  const r = rateLimits.render(MOCK_STDIN, { show: ["5h"] }, { usage: oauth });
  assert.ok(!r.ansi.includes("sn:"));
  assert.ok(!r.ansi.includes("wk:"));
});
