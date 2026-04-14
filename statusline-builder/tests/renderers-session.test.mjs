import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../renderers/index.mjs";
import user from "../renderers/user.mjs";
import folder from "../renderers/folder.mjs";
import sessionName from "../renderers/session-name.mjs";
import sessionTime from "../renderers/session-time.mjs";
import questionCount from "../renderers/question-count.mjs";
import agent from "../renderers/agent.mjs";
import vimMode from "../renderers/vim-mode.mjs";
import worktree from "../renderers/worktree.mjs";
import { MOCK_STDIN } from "../lib/mock-data.mjs";

test("user renderer returns username as pill text", () => {
  const r = user.render(MOCK_STDIN);
  assert.ok(r);
  assert.ok(typeof r.text === "string" && r.text.length > 0);
});

test("folder renderer returns basename of cwd", () => {
  const r = folder.render({ ...MOCK_STDIN, cwd: "/Users/me/foo/bar" });
  assert.equal(r.text, "bar");
});

test("folder renderer hides when cwd empty", () => {
  const r = folder.render({ ...MOCK_STDIN, cwd: "" });
  assert.equal(r, null);
});

test("session-name renders rename value", () => {
  const r = sessionName.render({ ...MOCK_STDIN, sessionName: "my-task" });
  assert.equal(r.text, "my-task");
});

test("session-name hides when absent", () => {
  const r = sessionName.render({ ...MOCK_STDIN, sessionName: "" });
  assert.equal(r, null);
});

test("session-time hides when transcriptPath missing and no mock", () => {
  const r = sessionTime.render({ ...MOCK_STDIN, transcriptPath: "", _mock: null });
  assert.equal(r, null);
});

test("question-count hides when zero and no mock", () => {
  const r = questionCount.render({ ...MOCK_STDIN, transcriptPath: "", _mock: null });
  assert.equal(r, null);
});

test("agent hides when empty", () => {
  assert.equal(agent.render({ ...MOCK_STDIN, agent: "" }), null);
  const r = agent.render({ ...MOCK_STDIN, agent: "planner" });
  assert.equal(r.text, "agent:planner");
});

test("vim-mode hides when empty, shows when present", () => {
  assert.equal(vimMode.render({ ...MOCK_STDIN, vimMode: "" }), null);
  const r = vimMode.render({ ...MOCK_STDIN, vimMode: "INSERT" });
  assert.equal(r.text, "[INSERT]");
});

test("worktree hides when name empty", () => {
  assert.equal(worktree.render({ ...MOCK_STDIN }), null);
  const r = worktree.render({ ...MOCK_STDIN, worktree: { name: "wt1", branch: "feat" } });
  assert.equal(r.text, "wt1(feat)");
});

test("catalog exports all 17 renderer ids", () => {
  const expected = [
    "user", "folder", "git", "session-name", "session-time", "question-count",
    "agent", "vim-mode", "worktree",
    "model", "output-style",
    "cost", "code-diff", "elapsed", "time",
    "context-bar", "rate-limits",
  ];
  assert.equal(expected.length, 17);
  for (const id of expected) {
    assert.ok(CATALOG[id], `missing renderer: ${id}`);
    assert.equal(CATALOG[id].id, id);
  }
});
