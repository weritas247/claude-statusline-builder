import { test } from "node:test";
import assert from "node:assert/strict";
import { ansiToHtml } from "../lib/ansi.mjs";

test("plain text passes through unchanged (HTML-escaped)", () => {
  assert.equal(ansiToHtml("hello"), "hello");
});

test("escapes HTML special chars", () => {
  assert.equal(ansiToHtml("a < b & c > d"), "a &lt; b &amp; c &gt; d");
});

test("truecolor fg wraps in styled span", () => {
  const out = ansiToHtml("\x1b[38;2;255;136;0mwarn\x1b[0m");
  assert.match(out, /<span style="[^"]*color:\s*rgb\(255,\s*136,\s*0\)[^"]*">warn<\/span>/);
});

test("truecolor bg wraps in styled span", () => {
  const out = ansiToHtml("\x1b[48;2;217;119;87m claude-env \x1b[0m");
  assert.match(out, /<span style="[^"]*background:\s*rgb\(217,\s*119,\s*87\)[^"]*">\s?claude-env\s?<\/span>/);
});

test("combined fg + bg + bold", () => {
  const out = ansiToHtml("\x1b[48;2;100;100;100m\x1b[38;2;255;255;255m\x1b[1mtext\x1b[0m");
  assert.match(out, /background:\s*rgb\(100,\s*100,\s*100\)/);
  assert.match(out, /color:\s*rgb\(255,\s*255,\s*255\)/);
  assert.match(out, /font-weight:\s*bold/);
});

test("basic color 32 maps to green", () => {
  const out = ansiToHtml("\x1b[32m+10\x1b[0m");
  assert.match(out, /color:\s*#2ecc71|color:\s*rgb\(46,\s*204,\s*113\)/);
});

test("powerline left cap pass through", () => {
  const out = ansiToHtml("\ue0b6 hi \ue0b4");
  assert.ok(out.includes("\ue0b6"));
  assert.ok(out.includes("\ue0b4"));
});

test("multiple resets close spans correctly", () => {
  const out = ansiToHtml("\x1b[31ma\x1b[0m\x1b[32mb\x1b[0m");
  const spanCount = (out.match(/<span /g) || []).length;
  const closeCount = (out.match(/<\/span>/g) || []).length;
  assert.equal(spanCount, closeCount);
  assert.ok(spanCount >= 2);
});

test("unknown sequence is stripped, content kept", () => {
  const out = ansiToHtml("\x1b[7mreverse\x1b[0m");
  assert.equal(out, "reverse");
});
