import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToAnsiFg, hexToAnsiBg, thresholdColor, SGR } from "../lib/color.mjs";

test("hexToAnsiFg converts hex to 24-bit SGR foreground", () => {
  assert.equal(hexToAnsiFg("#ff8800"), "\x1b[38;2;255;136;0m");
  assert.equal(hexToAnsiFg("#000000"), "\x1b[38;2;0;0;0m");
});

test("hexToAnsiBg converts hex to 24-bit SGR background", () => {
  assert.equal(hexToAnsiBg("#ff8800"), "\x1b[48;2;255;136;0m");
});

test("thresholdColor returns green/yellow/red based on percent", () => {
  assert.equal(thresholdColor(0), SGR.GREEN);
  assert.equal(thresholdColor(49), SGR.GREEN);
  assert.equal(thresholdColor(50), SGR.YELLOW);
  assert.equal(thresholdColor(79), SGR.YELLOW);
  assert.equal(thresholdColor(80), SGR.RED);
  assert.equal(thresholdColor(100), SGR.RED);
});

test("SGR exposes RESET, BOLD, DIM, GREEN, YELLOW, RED constants", () => {
  assert.equal(SGR.RESET, "\x1b[0m");
  assert.equal(SGR.BOLD, "\x1b[1m");
  assert.equal(SGR.DIM, "\x1b[38;2;150;150;150m");
  assert.ok(SGR.GREEN && SGR.YELLOW && SGR.RED);
});
