import { SGR, hexToAnsiFg } from "../lib/color.mjs";

export default {
  id: "elapsed",
  label: "Elapsed",
  category: "Budget",
  render(ctx, opts = {}) {
    const sec = Math.floor(ctx.cost.durationMs / 1000);
    if (sec === 0) return null;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const text = h > 0 ? `${h}h${m}m` : `${m}m`;
    const fg = opts.fg ? hexToAnsiFg(opts.fg) : "";
    const ansi = fg ? `${fg}${text}${SGR.RESET}` : text;
    return { text, ansi };
  },
};
