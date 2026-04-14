import user          from "./user.mjs";
import folder        from "./folder.mjs";
import git           from "./git.mjs";
import sessionName   from "./session-name.mjs";
import sessionTime   from "./session-time.mjs";
import questionCount from "./question-count.mjs";
import agent         from "./agent.mjs";
import vimMode       from "./vim-mode.mjs";
import worktree      from "./worktree.mjs";
import model         from "./model.mjs";
import outputStyle   from "./output-style.mjs";
import cost          from "./cost.mjs";
import codeDiff      from "./code-diff.mjs";
import elapsed       from "./elapsed.mjs";
import time          from "./time.mjs";
import contextBar    from "./context-bar.mjs";
import rateLimits    from "./rate-limits.mjs";

const all = [
  user, folder, git, sessionName, sessionTime, questionCount, agent, vimMode, worktree,
  model, outputStyle,
  cost, codeDiff, elapsed, time,
  contextBar, rateLimits,
];

export const CATALOG = Object.freeze(
  Object.fromEntries(all.map(r => [r.id, r]))
);
