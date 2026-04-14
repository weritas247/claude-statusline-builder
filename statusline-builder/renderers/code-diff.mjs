import { SGR } from "../lib/color.mjs";
export default {
  id: "code-diff",
  label: "Code diff",
  category: "Budget",
  render(ctx) {
    const added = ctx.cost.linesAdded;
    const removed = ctx.cost.linesRemoved;
    const label = `${SGR.DIM}code:${SGR.RESET}`;
    const a = `${SGR.GREEN}+${added}${SGR.RESET}`;
    const r = `${SGR.RED}-${removed}${SGR.RESET}`;
    return { ansi: `${label}${a}/${r}` };
  },
};
