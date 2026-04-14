// Fixture representing a typical parsed stdin ctx, used for tests and
// for the builder preview when real stdin isn't available.
export const MOCK_STDIN = {
  model:       { displayName: "Opus 4.6 (1M context)", version: "2.1.105" },
  sessionId:   "abc12345def",
  sessionName: "statusline-builder",
  cwd:         "/Users/me/dev/command-center/settings/claude-env",
  transcriptPath: "",
  agent:       "",
  outputStyle: "",
  vimMode:     "",
  worktree:    { name: "", branch: "" },
  cost: {
    totalUsd:      4.2266,
    durationMs:    1472000,
    apiDurationMs: 357000,
    linesAdded:    101,
    linesRemoved:  10,
  },
  context: {
    percent:      16,
    size:         1000000,
    inputTokens:  523,
    outputTokens: 24200,
  },
  rateLimits: {
    fiveHour: { percent: 23, resetsAt: 0 },
    sevenDay: { percent: 89, resetsAt: 0 },
  },
  // Preview-only overrides. Real stdin never contains _mock.
  _mock: {
    gitInfo:       { branch: "main", dirty: 3, ahead: 1, behind: 0, hasUpstream: true },
    sessionTime:   "09:42",
    questionCount: 7,
  },
};
