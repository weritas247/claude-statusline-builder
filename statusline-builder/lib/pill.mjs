import { SGR, hexToAnsiFg, hexToAnsiBg } from "./color.mjs";

// Cap glyph pairs by style. Index 0 = left cap, 1 = right cap.
const CAPS = {
  round:  ["\ue0b6", "\ue0b4"],
  slant:  ["\ue0bc", "\ue0be"],
  arrow:  ["\ue0b2", "\ue0b0"],
  square: ["", ""],
  none:   ["", ""],
};

function capGlyph(style, side) {
  return (CAPS[style] || CAPS.round)[side];
}

/**
 * Assemble a line of pill segments where EACH segment is its own
 * self-contained pill. Per-element options:
 *
 *   bg       — hex background color
 *   fg       — hex text color
 *   text     — inner text
 *   capLeft  — cap style for left side: "round"|"slant"|"arrow"|"square"|"none" (default "round")
 *   capRight — cap style for right side (same options, default "round")
 *   gap      — spaces between this pill and the next (default 1)
 *
 * Legacy: capStyle sets both sides if capLeft/capRight are absent.
 */
export function assemblePillLine(segments) {
  if (!segments || segments.length === 0) return "";
  const parts = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const capL = seg.capLeft  ?? seg.capStyle ?? "round";
    const capR = seg.capRight ?? seg.capStyle ?? "round";
    const gap  = Math.max(0, seg.gap ?? 1);

    const bgFg = hexToAnsiFg(seg.bg);
    const bg   = hexToAnsiBg(seg.bg);
    const fg   = hexToAnsiFg(seg.fg);

    const leftGlyph  = capGlyph(capL, 0);
    const rightGlyph = capGlyph(capR, 1);
    const left  = leftGlyph  ? `${bgFg}${leftGlyph}${SGR.RESET}` : "";
    const right = rightGlyph ? `${bgFg}${rightGlyph}${SGR.RESET}` : "";

    const separator = i < segments.length - 1 ? " ".repeat(gap) : "";
    parts.push(`${left}${bg}${fg}${SGR.BOLD} ${seg.text} ${SGR.RESET}${right}${separator}`);
  }
  return parts.join("");
}
