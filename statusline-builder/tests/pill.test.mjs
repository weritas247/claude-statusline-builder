import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePillLine } from "../lib/pill.mjs";

const ROUND_L = "\ue0b6";
const ROUND_R = "\ue0b4";
const SLANT_L = "\ue0bc";
const SLANT_R = "\ue0be";

test("empty input returns empty string", () => {
  assert.equal(assemblePillLine([]), "");
});

test("single segment defaults to round caps both sides", () => {
  const out = assemblePillLine([{ bg: "#D97757", fg: "#000000", text: "claude-env" }]);
  assert.ok(out.includes(ROUND_L));
  assert.ok(out.includes(ROUND_R));
  assert.ok(out.includes("claude-env"));
  // Cap colored as the bg
  assert.ok(out.includes("\x1b[38;2;217;119;87m"));
});

test("each segment gets its own pair of caps (per-element pills)", () => {
  const out = assemblePillLine([
    { bg: "#8B73B9", fg: "#ffffff", text: "user" },
    { bg: "#D97757", fg: "#000000", text: "folder" },
    { bg: "#E8A88A", fg: "#000000", text: "git" }
  ]);
  const leftCaps  = (out.match(new RegExp(ROUND_L, "g")) || []).length;
  const rightCaps = (out.match(new RegExp(ROUND_R, "g")) || []).length;
  assert.equal(leftCaps,  3, "one left cap per segment");
  assert.equal(rightCaps, 3, "one right cap per segment");
  assert.ok(out.indexOf("user")   < out.indexOf("folder"));
  assert.ok(out.indexOf("folder") < out.indexOf("git"));
});

test("segments are separated by gap spaces (default 1)", () => {
  const out = assemblePillLine([
    { bg: "#111", fg: "#fff", text: "a" },
    { bg: "#222", fg: "#fff", text: "b" }
  ]);
  const stripped = out.replace(/\x1b\[[0-9;]*m/g, "").replace(/[\ue0b6\ue0b4]/g, "");
  // Pills: " a " + gap(1) + " b " → at least 2 spaces between a and b
  assert.ok(/ a {2,}b /.test(stripped),
    `expected space between pills, got: ${JSON.stringify(stripped)}`);
});

test("gap:0 removes space between pills", () => {
  const out = assemblePillLine([
    { bg: "#111", fg: "#fff", text: "a", gap: 0 },
    { bg: "#222", fg: "#fff", text: "b" }
  ]);
  const stripped = out.replace(/\x1b\[[0-9;]*m/g, "").replace(/[\ue0b6\ue0b4\ue0be\ue0bc\ue0b0\ue0b2]/g, "");
  // Right-padding of "a" pill meets left-padding of "b" with no extra space
  assert.ok(/ a  b /.test(stripped),
    `expected no extra gap, got: ${JSON.stringify(stripped)}`);
});

test("gap:3 adds 3 spaces between pills", () => {
  const out = assemblePillLine([
    { bg: "#111", fg: "#fff", text: "a", gap: 3 },
    { bg: "#222", fg: "#fff", text: "b" }
  ]);
  const stripped = out.replace(/\x1b\[[0-9;]*m/g, "").replace(/[\ue0b6\ue0b4]/g, "");
  // " a " + "   " (gap) + " b " → 5 spaces total between a and b
  assert.ok(/ a {5,}b /.test(stripped),
    `expected 5+ spaces between pills, got: ${JSON.stringify(stripped)}`);
});

test("capStyle: square has no glyph caps (legacy compat)", () => {
  const out = assemblePillLine([{ bg: "#111", fg: "#fff", text: "x", capStyle: "square" }]);
  assert.ok(!out.includes(ROUND_L));
  assert.ok(!out.includes(ROUND_R));
  assert.ok(!out.includes(SLANT_L));
  assert.ok(out.includes("x"));
});

test("capLeft/capRight: left round, right square", () => {
  const out = assemblePillLine([{ bg: "#111", fg: "#fff", text: "x", capLeft: "round", capRight: "square" }]);
  assert.ok(out.includes(ROUND_L), "left cap present");
  assert.ok(!out.includes(ROUND_R), "right round cap absent");
});

test("capLeft/capRight: left none, right slant", () => {
  const out = assemblePillLine([{ bg: "#111", fg: "#fff", text: "x", capLeft: "none", capRight: "slant" }]);
  assert.ok(!out.includes(ROUND_L));
  assert.ok(!out.includes(SLANT_L));
  assert.ok(out.includes(SLANT_R));
});

test("capStyle: slant uses slope glyphs (legacy compat)", () => {
  const out = assemblePillLine([{ bg: "#111", fg: "#fff", text: "x", capStyle: "slant" }]);
  assert.ok(out.includes(SLANT_L));
  assert.ok(out.includes(SLANT_R));
  assert.ok(!out.includes(ROUND_L));
});

test("capStyle: none is a synonym for no caps (legacy compat)", () => {
  const out = assemblePillLine([{ bg: "#111", fg: "#fff", text: "x", capStyle: "none" }]);
  assert.ok(!out.includes(ROUND_L));
  assert.ok(!out.includes(SLANT_L));
});

test("wraps text with single space padding", () => {
  const out = assemblePillLine([{ bg: "#333", fg: "#fff", text: "x" }]);
  assert.ok(out.includes(" x "));
});

test("emits SGR reset after each pill body so colors don't bleed", () => {
  const out = assemblePillLine([
    { bg: "#111", fg: "#fff", text: "a" },
    { bg: "#222", fg: "#fff", text: "b" }
  ]);
  const resets = (out.match(/\x1b\[0m/g) || []).length;
  // Each pill: 1 left cap reset + 1 body reset + 1 right cap reset = 3 → 6 for 2 pills
  assert.ok(resets >= 6, `expected >=6 SGR resets, got ${resets}`);
});
