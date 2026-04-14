export default {
  id: "worktree",
  label: "Worktree",
  category: "Session",
  render(ctx) {
    const wt = ctx.worktree;
    if (!wt || !wt.name) return null;
    return { text: `${wt.name}(${wt.branch})` };
  },
};
