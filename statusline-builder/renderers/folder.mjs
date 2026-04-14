import { basename } from "node:path";
export default {
  id: "folder",
  label: "Folder",
  category: "Session",
  render(ctx) {
    if (!ctx.cwd) return null;
    return { text: basename(ctx.cwd) };
  },
};
