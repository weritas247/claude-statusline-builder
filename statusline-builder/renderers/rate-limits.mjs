import { SGR, thresholdColor } from "../lib/color.mjs";

function fmtResetIso(iso) {
  if (!iso || iso === 0) return "";
  // Accept ISO 8601 with or without fractional seconds and any offset
  const norm = String(iso).replace(/\.[0-9]+/, "").replace(/[+-][0-9]{2}:[0-9]{2}$/, "Z");
  const ms = Date.parse(norm);
  if (Number.isNaN(ms)) return "";
  const diff = Math.floor((ms - Date.now()) / 1000);
  if (diff <= 0) return "now";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d${h}h`;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

function pick(usage, key) {
  if (!usage) return null;
  const map = { "5h": "five_hour", wk: "seven_day", sn: "seven_day_sonnet", op: "seven_day_opus" };
  const k = map[key];
  const node = usage[k];
  if (!node || typeof node.utilization !== "number") return null;
  return { pct: Math.round(node.utilization), resetsAt: node.resets_at ?? "" };
}

function fallback(ctx, key) {
  if (key === "5h") return { pct: Math.round(ctx.rateLimits.fiveHour.percent), resetsAt: ctx.rateLimits.fiveHour.resetsAt };
  if (key === "wk") return { pct: Math.round(ctx.rateLimits.sevenDay.percent), resetsAt: ctx.rateLimits.sevenDay.resetsAt };
  return null;
}

export default {
  id: "rate-limits",
  label: "Rate limits",
  category: "Performance",
  render(ctx, opts = {}, external = {}) {
    const show = opts.show && Array.isArray(opts.show) && opts.show.length > 0
      ? opts.show
      : ["5h", "wk", "sn"];
    const usage = external.usage;
    const parts = [];
    const textParts = [];
    for (const key of show) {
      const v = pick(usage, key) ?? fallback(ctx, key);
      if (!v) continue;
      const color = thresholdColor(v.pct);
      const reset = fmtResetIso(v.resetsAt);
      let s = `${SGR.DIM}${key}:${SGR.RESET}${color}${v.pct}%${SGR.RESET}`;
      if (reset) s += `${SGR.DIM}(${reset})${SGR.RESET}`;
      parts.push(s);
      textParts.push(reset ? `${key}:${v.pct}%(${reset})` : `${key}:${v.pct}%`);
    }
    if (parts.length === 0) return null;
    return { text: textParts.join(" "), ansi: parts.join(" ") };
  },
};
