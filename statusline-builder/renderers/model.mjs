export default {
  id: "model",
  label: "Model",
  category: "Model",
  render(ctx, opts = {}) {
    const name = ctx.model.displayName;
    if (opts.showVersion === false) return { text: name };
    return { text: `${name} v${ctx.model.version}` };
  },
};
