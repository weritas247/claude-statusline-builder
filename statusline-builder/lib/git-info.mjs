import { execFileSync } from "node:child_process";

function gitOut(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Inspect a working directory for git state. Returns null if the path
 * isn't inside a git repo. Never throws — any git failure resolves to
 * null so the renderer hides the git element.
 */
export function getGitInfo(cwd) {
  if (!cwd) return null;
  const inside = gitOut(cwd, ["rev-parse", "--is-inside-work-tree"]);
  if (inside !== "true") return null;

  const branch =
    gitOut(cwd, ["symbolic-ref", "--short", "HEAD"]) ||
    gitOut(cwd, ["rev-parse", "--short", "HEAD"]) ||
    "";

  const porcelain = gitOut(cwd, ["status", "--porcelain"]) || "";
  const dirty = porcelain.length === 0 ? 0 : porcelain.split("\n").length;

  let ahead = 0;
  let behind = 0;
  const upstream = gitOut(cwd, ["rev-parse", "--abbrev-ref", "@{upstream}"]);
  if (upstream) {
    ahead  = Number(gitOut(cwd, ["rev-list", "--count", "@{upstream}..HEAD"]) || 0);
    behind = Number(gitOut(cwd, ["rev-list", "--count", "HEAD..@{upstream}"]) || 0);
  }

  return { branch, dirty, ahead, behind, hasUpstream: Boolean(upstream) };
}
