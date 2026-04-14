import { readFileSync, existsSync } from "node:fs";
import { DEFAULT_CONFIG } from "./default-config.mjs";

export function isValid(cfg) {
  if (!cfg || typeof cfg !== "object") return false;
  if (!Array.isArray(cfg.lines)) return false;
  for (const line of cfg.lines) {
    if (!line || (line.style !== "pills" && line.style !== "plain")) return false;
    if (!Array.isArray(line.elements)) return false;
    for (const el of line.elements) {
      if (!el || typeof el.type !== "string") return false;
    }
  }
  return true;
}

/**
 * Load statusline.json from path. Missing, unreadable, malformed, or
 * schema-invalid files all fall back to DEFAULT_CONFIG. Errors are swallowed
 * because the statusline must always render something — the worst case
 * is users see the default layout instead of their custom one.
 */
export function loadConfig(path) {
  try {
    if (!existsSync(path)) return DEFAULT_CONFIG;
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (!isValid(parsed)) return DEFAULT_CONFIG;
    return parsed;
  } catch {
    return DEFAULT_CONFIG;
  }
}
