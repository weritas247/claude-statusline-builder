import { test } from "node:test";
import assert from "node:assert/strict";
import model from "../renderers/model.mjs";
import outputStyle from "../renderers/output-style.mjs";
import cost from "../renderers/cost.mjs";
import codeDiff from "../renderers/code-diff.mjs";
import elapsed from "../renderers/elapsed.mjs";
import time from "../renderers/time.mjs";
import { MOCK_STDIN } from "../lib/mock-data.mjs";

test("model renders display name + version", () => {
  const r = model.render(MOCK_STDIN, { showVersion: true });
  assert.equal(r.text, "Opus 4.6 (1M context) v2.1.105");
});

test("model hides version when showVersion=false", () => {
  const r = model.render(MOCK_STDIN, { showVersion: false });
  assert.equal(r.text, "Opus 4.6 (1M context)");
});

test("output-style hides empty / default", () => {
  assert.equal(outputStyle.render({ ...MOCK_STDIN, outputStyle: "" }), null);
  assert.equal(outputStyle.render({ ...MOCK_STDIN, outputStyle: "default" }), null);
  const r = outputStyle.render({ ...MOCK_STDIN, outputStyle: "explanatory" });
  assert.equal(r.text, "style:explanatory");
});

test("cost renders formatted USD (plain style, emits ansi)", () => {
  const r = cost.render(MOCK_STDIN);
  assert.ok(r.ansi.includes("$4.2266"));
});

test("code-diff renders +added/-removed with green/red", () => {
  const r = codeDiff.render(MOCK_STDIN);
  assert.ok(r.ansi.includes("+101"));
  assert.ok(r.ansi.includes("-10"));
});

test("elapsed formats hours+minutes or minutes", () => {
  const r = elapsed.render(MOCK_STDIN);
  // 1472000ms ≈ 24m
  assert.equal(r.text, "24m");

  const r2 = elapsed.render({ ...MOCK_STDIN, cost: { ...MOCK_STDIN.cost, durationMs: 3_900_000 } });
  // 65 minutes = 1h5m
  assert.equal(r2.text, "1h5m");
});

test("time renders wall / api durations", () => {
  const r = time.render(MOCK_STDIN);
  assert.ok(r.ansi.includes("24m32s"));
  assert.ok(r.ansi.includes("5m57s"));
});

test("cost honors opts.fg as primary color", () => {
  const r = cost.render(MOCK_STDIN, { fg: "#ff8800" });
  assert.ok(r.ansi.includes("\x1b[38;2;255;136;0m"), "uses 255,136,0 for fg");
  assert.ok(r.ansi.includes("$4.2266"));
});

test("cost falls back to CYAN when opts.fg absent", () => {
  const r = cost.render(MOCK_STDIN, {});
  assert.ok(r.ansi.includes("\x1b[36m"), "uses cyan default");
});

test("elapsed includes both text and ansi fields", () => {
  const r = elapsed.render(MOCK_STDIN);
  assert.equal(r.text, "24m");
  assert.equal(r.ansi, "24m");  // no fg → ansi == text
});

test("elapsed wraps with fg when opts.fg set", () => {
  const r = elapsed.render(MOCK_STDIN, { fg: "#ff8800" });
  assert.ok(r.ansi.includes("\x1b[38;2;255;136;0m"));
  assert.ok(r.ansi.includes("24m"));
});

test("time honors opts.fg on the value parts", () => {
  const r = time.render(MOCK_STDIN, { fg: "#ff8800" });
  assert.ok(r.ansi.includes("\x1b[38;2;255;136;0m"));
  assert.ok(r.ansi.includes("24m32s"));
});
