export const SGR = {
  RESET:  "\x1b[0m",
  BOLD:   "\x1b[1m",
  DIM:    "\x1b[38;2;150;150;150m",
  GREEN:  "\x1b[32m",
  YELLOW: "\x1b[33m",
  RED:    "\x1b[31m",
  CYAN:   "\x1b[36m",
};

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function hexToAnsiFg(hex) {
  const [r, g, b] = parseHex(hex);
  return `\x1b[38;2;${r};${g};${b}m`;
}

export function hexToAnsiBg(hex) {
  const [r, g, b] = parseHex(hex);
  return `\x1b[48;2;${r};${g};${b}m`;
}

export function thresholdColor(pct) {
  if (pct >= 80) return SGR.RED;
  if (pct >= 50) return SGR.YELLOW;
  return SGR.GREEN;
}
