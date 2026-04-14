/**
 * Parse Claude Code's stdin JSON into a normalized context object used
 * by all renderers. Unknown or missing fields get safe defaults so
 * renderers can assume their inputs exist.
 */
export function parseStdinJson(raw) {
  let j = {};
  try { j = JSON.parse(raw || "{}") || {}; } catch { j = {}; }

  const cost = j.cost || {};
  const ctxw = j.context_window || {};
  const rl = j.rate_limits || {};
  const rl5 = rl.five_hour || {};
  const rl7 = rl.seven_day || {};

  return {
    model: {
      displayName: j.model?.display_name ?? "?",
      version:     j.version ?? "?",
    },
    sessionId:    j.session_id ?? "",
    sessionName:  j.session_name ?? "",
    cwd:          j.cwd ?? "",
    transcriptPath: j.transcript_path ?? "",
    agent:        j.agent?.name ?? "",
    outputStyle:  j.output_style?.name ?? "",
    vimMode:      j.vim?.mode ?? "",
    worktree: {
      name:   j.worktree?.name ?? "",
      branch: j.worktree?.branch ?? "",
    },
    cost: {
      totalUsd:      Number(cost.total_cost_usd       ?? 0),
      durationMs:    Number(cost.total_duration_ms    ?? 0),
      apiDurationMs: Number(cost.total_api_duration_ms ?? 0),
      linesAdded:    Number(cost.total_lines_added    ?? 0),
      linesRemoved:  Number(cost.total_lines_removed  ?? 0),
    },
    context: {
      percent:      Number(ctxw.used_percentage      ?? 0),
      size:         Number(ctxw.context_window_size  ?? 0),
      inputTokens:  Number(ctxw.total_input_tokens   ?? 0),
      outputTokens: Number(ctxw.total_output_tokens  ?? 0),
    },
    rateLimits: {
      fiveHour: {
        percent:   Number(rl5.used_percentage ?? 0),
        resetsAt:  rl5.resets_at ?? 0,
      },
      sevenDay: {
        percent:   Number(rl7.used_percentage ?? 0),
        resetsAt:  rl7.resets_at ?? 0,
      },
    },
  };
}
