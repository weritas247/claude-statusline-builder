/**
 * Assemble a plain (non-pill) line by joining each element's ANSI output
 * with two-space gaps. Elements whose renderer returned empty are hidden.
 * Each element renderer is responsible for its own label:value coloring.
 */
export function assemblePlainLine(elements) {
  if (!elements || elements.length === 0) return "";
  return elements
    .map(e => e && typeof e.ansi === "string" ? e.ansi : "")
    .filter(s => s.length > 0)
    .join("  ");
}
