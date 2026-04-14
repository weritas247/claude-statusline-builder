import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getGitInfo } from "../lib/git-info.mjs";

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "sl-git-"));
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "t@t"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "t"], { cwd: dir });
  writeFileSync(join(dir, "a.txt"), "x");
  execFileSync("git", ["add", "a.txt"], { cwd: dir });
  execFileSync("git", ["commit", "-q", "-m", "init"], { cwd: dir });
  return dir;
}

test("returns null outside a git repo", () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-git-nonrepo-"));
  assert.equal(getGitInfo(dir), null);
  rmSync(dir, { recursive: true, force: true });
});

test("returns branch name in a clean repo", () => {
  const dir = makeRepo();
  const info = getGitInfo(dir);
  assert.equal(info.branch, "main");
  assert.equal(info.dirty, 0);
  assert.equal(info.ahead, 0);
  assert.equal(info.behind, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("detects dirty files", () => {
  const dir = makeRepo();
  writeFileSync(join(dir, "b.txt"), "y");
  const info = getGitInfo(dir);
  assert.equal(info.branch, "main");
  assert.equal(info.dirty, 1);
  rmSync(dir, { recursive: true, force: true });
});
