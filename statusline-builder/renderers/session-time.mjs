import { statSync } from "node:fs";
export default {
  id: "session-time",
  label: "Session time",
  category: "Session",
  render(ctx) {
    if (ctx._mock?.sessionTime) return { text: ctx._mock.sessionTime };
    if (!ctx.transcriptPath) return null;
    try {
      const birth = statSync(ctx.transcriptPath).birthtime;
      const hh = String(birth.getHours()).padStart(2, "0");
      const mm = String(birth.getMinutes()).padStart(2, "0");
      return { text: `${hh}:${mm}` };
    } catch {
      return null;
    }
  },
};
