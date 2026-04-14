import { SGR, hexToAnsiFg } from "../lib/color.mjs";
export default {
  id: "cost",
  label: "Cost",
  category: "Budget",
  render(ctx, opts = {}) {
    const precision = opts.precision ?? 4;
    const str = `$${ctx.cost.totalUsd.toFixed(precision)}`;
    const fg = opts.fg ? hexToAnsiFg(opts.fg) : SGR.CYAN;
    return { text: str, ansi: `${fg}${str}${SGR.RESET}` };
  },
};
