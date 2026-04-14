// SGR escape → HTML <span> converter for the builder preview.
// Supports the exact subset of SGR codes the runtime emits; unknown sequences
// are silently dropped so unknown future codes don't break the preview.

const BASIC_COLORS = {
  31: "rgb(204, 51, 51)",   // red
  32: "rgb(46, 204, 113)",  // green
  33: "rgb(241, 196, 15)",  // yellow
  34: "rgb(52, 152, 219)",  // blue
  36: "rgb(26, 188, 156)",  // cyan
};

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function styleString(state) {
  const parts = [];
  if (state.fg) parts.push(`color: ${state.fg}`);
  if (state.bg) parts.push(`background: ${state.bg}`);
  if (state.bold) parts.push("font-weight: bold");
  return parts.join("; ");
}

function spanOpen(state) {
  const css = styleString(state);
  return css ? `<span style="${css}">` : "";
}

function spanClose(state) {
  return styleString(state) ? "</span>" : "";
}

/**
 * Convert an ANSI string (SGR sequences only) into HTML.
 * Each contiguous run of styled text becomes one <span>.
 * Resets close the current span. Powerline glyphs pass through.
 */
export function ansiToHtml(input) {
  if (!input) return "";
  let out = "";
  let state = { fg: null, bg: null, bold: false };
  let buf = "";

  const flush = () => {
    if (buf.length === 0) return;
    out += spanOpen(state) + escapeHtml(buf) + spanClose(state);
    buf = "";
  };

  const re = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(input)) !== null) {
    if (m.index > lastIndex) buf += input.slice(lastIndex, m.index);
    flush();
    applyParams(state, m[1]);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < input.length) buf += input.slice(lastIndex);
  flush();

  return out;
}

function applyParams(state, raw) {
  const params = (raw || "").split(";").map(Number);
  let i = 0;
  while (i < params.length) {
    const p = params[i];
    if (p === 0 || Number.isNaN(p)) {
      state.fg = null;
      state.bg = null;
      state.bold = false;
      i++;
    } else if (p === 1) {
      state.bold = true;
      i++;
    } else if (p === 2) {
      state.fg = "rgb(150, 150, 150)";
      i++;
    } else if (p === 22) {
      state.bold = false;
      i++;
    } else if (BASIC_COLORS[p] != null) {
      state.fg = BASIC_COLORS[p];
      i++;
    } else if (p === 38 && params[i + 1] === 2) {
      const r = params[i + 2] ?? 0;
      const g = params[i + 3] ?? 0;
      const b = params[i + 4] ?? 0;
      state.fg = `rgb(${r}, ${g}, ${b})`;
      i += 5;
    } else if (p === 48 && params[i + 1] === 2) {
      const r = params[i + 2] ?? 0;
      const g = params[i + 3] ?? 0;
      const b = params[i + 4] ?? 0;
      state.bg = `rgb(${r}, ${g}, ${b})`;
      i += 5;
    } else {
      i++;
    }
  }
}
