import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStdinJson } from "../lib/stdin-parse.mjs";
import { MOCK_STDIN } from "../lib/mock-data.mjs";

test("parses a representative Claude Code stdin JSON into normalized ctx", () => {
  const raw = JSON.stringify({
    model: { display_name: "Opus 4.6 (1M context)" },
    version: "2.1.105",
    session_id: "abc12345xyz",
    cwd: "/Users/me/project",
    transcript_path: "/tmp/transcript.jsonl",
    cost: {
      total_cost_usd: 4.2266,
      total_duration_ms: 1472000,
      total_api_duration_ms: 357000,
      total_lines_added: 101,
      total_lines_removed: 10
    },
    context_window: {
      used_percentage: 16,
      context_window_size: 1000000,
      total_input_tokens: 523,
      total_output_tokens: 24200
    },
    rate_limits: {
      five_hour: { used_percentage: 23, resets_at: 0 },
      seven_day: { used_percentage: 89, resets_at: 0 }
    }
  });

  const ctx = parseStdinJson(raw);
  assert.equal(ctx.model.displayName, "Opus 4.6 (1M context)");
  assert.equal(ctx.model.version, "2.1.105");
  assert.equal(ctx.cwd, "/Users/me/project");
  assert.equal(ctx.sessionId, "abc12345xyz");
  assert.equal(ctx.cost.totalUsd, 4.2266);
  assert.equal(ctx.cost.linesAdded, 101);
  assert.equal(ctx.context.percent, 16);
  assert.equal(ctx.rateLimits.fiveHour.percent, 23);
});

test("tolerates missing fields with safe defaults", () => {
  const ctx = parseStdinJson("{}");
  assert.equal(ctx.model.displayName, "?");
  assert.equal(ctx.model.version, "?");
  assert.equal(ctx.cwd, "");
  assert.equal(ctx.cost.totalUsd, 0);
  assert.equal(ctx.context.percent, 0);
});

test("MOCK_STDIN is a valid stdin-parse-shaped ctx", () => {
  // mock-data.mjs should export the POST-parse shape directly
  assert.ok(MOCK_STDIN.model && MOCK_STDIN.cwd !== undefined);
  assert.equal(typeof MOCK_STDIN.cost.totalUsd, "number");
  assert.equal(typeof MOCK_STDIN.context.percent, "number");
});
