export default {
  id: "agent",
  label: "Agent",
  category: "Session",
  render(ctx) {
    if (!ctx.agent) return null;
    return { text: `agent:${ctx.agent}` };
  },
};
