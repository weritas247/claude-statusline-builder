import { MOCK_STDIN } from "./mock-data.mjs";
import { CATALOG } from "../renderers/index.mjs";
import { assemblePillLine } from "./pill.mjs";
import { assemblePlainLine } from "./plain.mjs";
import { ansiToHtml } from "./ansi.mjs";
import { SGR, hexToAnsiFg } from "./color.mjs";

// Mock OAuth usage data so rate-limits renders something visible in preview.
const MOCK_USAGE = {
  five_hour:        { utilization: 23.0, resets_at: 0 },
  seven_day:        { utilization: 89.0, resets_at: 0 },
  seven_day_sonnet: { utilization:  4.0, resets_at: 0 },
};

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Map cap style name → CSS border-radius value for one side.
function capRadius(style) {
  if (style === "round")  return "10px";
  if (style === "slant")  return "3px";
  return "0";
}

/**
 * Collect rendered segments from a line (shared logic for both ANSI and HTML).
 * Returns an array of { pillData?, ansi? } objects.
 */
function collectSegments(line, ctx, external) {
  if (!line || !Array.isArray(line.elements)) return [];
  const segments = [];
  for (const el of line.elements) {
    if (!el || typeof el.type !== "string") continue;
    const r = CATALOG[el.type];
    if (!r) continue;
    const mergedOpts = { ...(el.opts || {}), fg: el.fg, bg: el.bg };
    let out;
    try {
      out = r.render(ctx, mergedOpts, external);
    } catch {
      out = null;
    }
    if (!out) continue;
    if (line.style === "pills") {
      const pillText = out.text || (out.ansi ? out.ansi.replace(/\x1b\[[0-9;]*m/g, "") : null);
      if (pillText) segments.push({
        pillData: {
          bg:       el.bg || "#333333",
          fg:       el.fg || "#ffffff",
          text:     pillText,
          capLeft:  el.capLeft  ?? el.capStyle ?? "round",
          capRight: el.capRight ?? el.capStyle ?? "round",
          gap:      el.gap      ?? 1,
        },
      });
    } else {
      let ansi;
      if (out.ansi) ansi = out.ansi;
      else if (out.text) ansi = out.text;
      else continue;
      if (el.fg) {
        const bare = ansi.replace(/\x1b\[[0-9;]*m/g, "");
        ansi = `${hexToAnsiFg(el.fg)}${bare}${SGR.RESET}`;
      }
      segments.push({ ansi });
    }
  }
  return segments;
}

function renderLineAnsi(line, ctx, external) {
  const segs = collectSegments(line, ctx, external);
  if (segs.length === 0) return "";
  if (line.style === "pills") {
    return assemblePillLine(segs.map(s => s.pillData));
  }
  return assemblePlainLine(segs.map(s => ({ ansi: s.ansi })));
}

/**
 * Render a pills line to HTML using CSS border-radius so rounded caps show
 * correctly in browsers (no Powerline font required).
 */
function renderLineHtml(line, ctx, external) {
  const segs = collectSegments(line, ctx, external);
  if (segs.length === 0) return "";
  if (line.style === "pills") {
    return segs.map((s, i) => {
      const p = s.pillData;
      const rL = capRadius(p.capLeft);
      const rR = capRadius(p.capRight);
      const marginRight = i < segs.length - 1 ? `margin-right:${Math.max(0, p.gap) * 4}px` : "";
      const style = [
        `background:${p.bg}`,
        `color:${p.fg}`,
        `border-radius:${rL} ${rR} ${rR} ${rL}`,
        "padding:2px 8px",
        "font-weight:bold",
        "display:inline-block",
        "line-height:1.6",
        marginRight,
      ].filter(Boolean).join(";");
      return `<span style="${style}">${escapeHtml(p.text)}</span>`;
    }).join("");
  }
  return ansiToHtml(assemblePlainLine(segs.map(s => ({ ansi: s.ansi }))));
}

/**
 * Render a config to ANSI + HTML using mock stdin data.
 * Used by the builder preview endpoint. Never throws — bad config falls back
 * to an empty result so the preview UI shows nothing instead of crashing.
 */
export function renderPreview(config) {
  if (!config || typeof config !== "object" || !Array.isArray(config.lines)) {
    return { ansi: "", html: "" };
  }
  const ctx = MOCK_STDIN;
  const external = { usage: MOCK_USAGE };

  const ansiLines = [];
  const htmlLines = [];
  for (const line of config.lines) {
    const a = renderLineAnsi(line, ctx, external);
    const h = renderLineHtml(line, ctx, external);
    if (a) ansiLines.push(a);
    if (h) htmlLines.push(h);
  }
  return {
    ansi: ansiLines.join("\n"),
    html: htmlLines.join("<br>"),
  };
}
