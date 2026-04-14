// Mirrors the current bash statusline layout so users get visual parity
// when statusline.json is missing.
export const DEFAULT_CONFIG = {
  version: 1,
  lines: [
    {
      style: "pills",
      elements: [
        { type: "user",    bg: "#8B73B9", fg: "#ffffff" },
        { type: "folder",  bg: "#D97757", fg: "#000000" },
        { type: "git",     bg: "#E8A88A", fg: "#000000",
          opts: { showDirty: true, showAheadBehind: true } },
        { type: "elapsed", bg: "#4682B4", fg: "#ffffff" }
      ]
    },
    {
      style: "pills",
      elements: [
        { type: "model",          bg: "#505050", fg: "#ffffff", opts: { showVersion: true } },
        { type: "session-time",   bg: "#646464", fg: "#ffffff" },
        { type: "question-count", bg: "#787878", fg: "#ffffff" }
      ]
    },
    {
      style: "plain",
      elements: [
        { type: "context-bar", opts: { width: 20 } },
        { type: "rate-limits", opts: { show: ["5h", "wk", "sn"] } }
      ]
    },
    {
      style: "plain",
      elements: [
        { type: "cost" },
        { type: "time" },
        { type: "code-diff" }
      ]
    }
  ]
};
