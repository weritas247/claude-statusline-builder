import { getGitInfo } from "../lib/git-info.mjs";
export default {
  id: "git",
  label: "Git",
  category: "Session",
  render(ctx, opts = {}) {
    const info = ctx._mock?.gitInfo || getGitInfo(ctx.cwd);
    if (!info) return null;
    let text = ` ${info.branch}`;
    if (opts.showDirty !== false && info.dirty > 0) text += `*${info.dirty}`;
    if (opts.showAheadBehind !== false && info.hasUpstream) {
      if (info.ahead > 0)  text += ` ↑${info.ahead}`;
      if (info.behind > 0) text += ` ↓${info.behind}`;
    }
    return { text };
  },
};
