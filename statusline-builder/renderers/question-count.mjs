import { readFileSync } from "node:fs";
export default {
  id: "question-count",
  label: "Question count",
  category: "Session",
  render(ctx) {
    if (ctx._mock?.questionCount != null) return { text: `(${ctx._mock.questionCount})` };
    if (!ctx.transcriptPath) return null;
    try {
      const lines = readFileSync(ctx.transcriptPath, "utf-8").split("\n");
      let count = 0;
      for (const line of lines) {
        if (!line) continue;
        try {
          const j = JSON.parse(line);
          if (j.type === "user") {
            const c = j.message?.content;
            const text = Array.isArray(c)
              ? c.filter(p => p.type === "text").map(p => p.text).join("")
              : (c ?? "");
            if (text.trim()) count++;
          }
        } catch {}
      }
      if (count === 0) return null;
      return { text: `(${count})` };
    } catch {
      return null;
    }
  },
};
