export default {
  id: "vim-mode",
  label: "Vim mode",
  category: "Session",
  render(ctx) {
    if (!ctx.vimMode) return null;
    return { text: `[${ctx.vimMode}]` };
  },
};
