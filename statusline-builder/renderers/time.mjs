import { SGR, hexToAnsiFg } from "../lib/color.mjs";

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

export default {
  id: "time",
  label: "Time",
  category: "Budget",
  render(ctx, opts = {}) {
    const wall = fmt(ctx.cost.durationMs);
    const api  = fmt(ctx.cost.apiDurationMs);
    const valueColor = opts.fg ? hexToAnsiFg(opts.fg) : "";
    const text = `time:${wall}/${api}`;
    return {
      text,
      ansi: `${SGR.DIM}time:${SGR.RESET}${valueColor}${wall}${SGR.RESET}${SGR.DIM}/${api}${SGR.RESET}`,
    };
  },
};
