import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePlainLine } from "../lib/plain.mjs";

test("joins multiple elements with two spaces", () => {
  const out = assemblePlainLine([
    { ansi: "foo" },
    { ansi: "bar" },
    { ansi: "baz" }
  ]);
  assert.equal(out, "foo  bar  baz");
});

test("filters out empty element outputs", () => {
  const out = assemblePlainLine([
    { ansi: "foo" },
    { ansi: "" },
    { ansi: "baz" }
  ]);
  assert.equal(out, "foo  baz");
});

test("empty or null input → empty string", () => {
  assert.equal(assemblePlainLine([]), "");
  assert.equal(assemblePlainLine(null), "");
});
