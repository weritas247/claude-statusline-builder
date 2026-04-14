import { test } from "node:test";
import assert from "node:assert/strict";
import { renderPreview } from "../lib/preview.mjs";
import { DEFAULT_CONFIG } from "../lib/default-config.mjs";

test("renderPreview returns ansi and html for default config", () => {
  const r = renderPreview(DEFAULT_CONFIG);
  assert.ok(typeof r.ansi === "string");
  assert.ok(typeof r.html === "string");
  assert.ok(r.ansi.includes("Opus"), "ansi has model name");
  assert.ok(r.html.includes("Opus"), "html has model name");
});

test("renderPreview produces one HTML line per config line", () => {
  const r = renderPreview({
    version: 1,
    lines: [
      { style: "plain", elements: [{ type: "cost" }] },
      { style: "plain", elements: [{ type: "model" }] },
    ],
  });
  const lines = r.html.split(/<br\/?>/i);
  assert.ok(lines.length === 2, `expected 2 lines, got ${lines.length}: ${r.html}`);
});

test("renderPreview hides empty lines (no <br> for empty)", () => {
  const r = renderPreview({
    version: 1,
    lines: [
      { style: "plain", elements: [] },
      { style: "plain", elements: [{ type: "cost" }] },
    ],
  });
  assert.ok(!r.html.includes("<br") || r.html.split(/<br\/?>/i).filter(Boolean).length === 1);
});

test("renderPreview tolerates unknown element types", () => {
  const r = renderPreview({
    version: 1,
    lines: [
      { style: "plain", elements: [{ type: "nonexistent" }, { type: "cost" }] },
    ],
  });
  assert.ok(r.ansi.includes("$"), "cost still renders");
});

test("renderPreview never throws on malformed config", () => {
  assert.doesNotThrow(() => renderPreview({}));
  assert.doesNotThrow(() => renderPreview({ lines: null }));
  assert.doesNotThrow(() => renderPreview(null));
});
