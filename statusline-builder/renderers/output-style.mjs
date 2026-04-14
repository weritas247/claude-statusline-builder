export default {
  id: "output-style",
  label: "Output style",
  category: "Model",
  render(ctx) {
    if (!ctx.outputStyle || ctx.outputStyle === "default") return null;
    return { text: `style:${ctx.outputStyle}` };
  },
};
