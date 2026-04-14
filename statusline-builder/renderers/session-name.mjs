export default {
  id: "session-name",
  label: "Session name",
  category: "Session",
  render(ctx, opts = {}) {
    if (!ctx.sessionName) return null;
    const max = opts.maxLen ?? 30;
    return { text: ctx.sessionName.slice(0, max) };
  },
};
