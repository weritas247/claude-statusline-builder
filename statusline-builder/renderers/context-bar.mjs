import { SGR, thresholdColor } from "../lib/color.mjs";
export default {
  id: "context-bar",
  label: "Context bar",
  category: "Performance",
  render(ctx, opts = {}) {
    const width = Math.max(1, opts.width ?? 20);
    const pct = Math.min(100, Math.max(0, Math.round(ctx.context.percent)));
    const filled = Math.min(width, Math.round((pct / 100) * width));
    const empty  = width - filled;
    const color  = thresholdColor(pct);
    const bar = `${color}${"█".repeat(filled)}${SGR.DIM}${"░".repeat(empty)}${SGR.RESET}`;
    const text = `${"█".repeat(filled)}${"░".repeat(empty)} ${pct}%`;
    return { text, ansi: `${bar} ${color}${pct}%${SGR.RESET}` };
  },
};
