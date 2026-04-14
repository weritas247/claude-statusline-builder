#!/usr/bin/env node
// Statusline runtime. Reads Claude Code stdin JSON + ~/.claude/statusline.json,
// fetches git/usage data, renders each line via the renderer catalog, and
// writes ANSI to stdout. Always exits 0 — any failure falls back to a best-effort
// render so Claude Code never shows an empty statusline.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import { parseStdinJson } from "./statusline-builder/lib/stdin-parse.mjs";
import { loadConfig } from "./statusline-builder/lib/config.mjs";
import { assemblePillLine } from "./statusline-builder/lib/pill.mjs";
import { assemblePlainLine } from "./statusline-builder/lib/plain.mjs";
import { CATALOG } from "./statusline-builder/renderers/index.mjs";
import { SGR, hexToAnsiFg } from "./statusline-builder/lib/color.mjs";
import {
  readUsageCache, isCacheFresh, spawnBackgroundRefresh, defaultCachePath,
} from "./statusline-builder/lib/usage-cache.mjs";

const CONFIG_PATH = process.env.STATUSLINE_CONFIG_PATH || join(homedir(), ".claude", "statusline.json");

function readStdinSync() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function loadUsage() {
  const path = defaultCachePath();
  const cache = readUsageCache(path);
  if (isCacheFresh(cache, 60)) return cache.data ?? null;
  // Spawn background refresh but return whatever we have (may be stale)
  spawnBackgroundRefresh(path);
  return cache?.data ?? null;
}

function renderLine(line, ctx, external) {
  const rendered = [];
  for (const el of line.elements) {
    const r = CATALOG[el.type];
    if (!r) continue;
    // Merge top-level fg/bg into opts so renderers can honor opts.fg
    // (cost/time/elapsed use this to override their primary color)
    const mergedOpts = { ...(el.opts || {}), fg: el.fg, bg: el.bg };
    let out;
    try {
      out = r.render(ctx, mergedOpts, external);
    } catch {
      out = null;
    }
    if (!out) continue;
    if (line.style === "pills") {
      // Prefer out.text; fall back to ANSI-stripped text for ansi-only renderers
      const pillText = out.text || (out.ansi ? out.ansi.replace(/\x1b\[[0-9;]*m/g, "") : null);
      if (pillText) rendered.push({
        bg: el.bg || "#333333",
        fg: el.fg || "#ffffff",
        text: pillText,
        capLeft:  el.capLeft  ?? el.capStyle ?? "round",
        capRight: el.capRight ?? el.capStyle ?? "round",
        gap:      el.gap      ?? 1,
      });
    } else {
      // plain: prefer ansi, fall back to text. If renderer didn't honor fg
      // (text-only renderers), wrap the output with the requested fg.
      let ansi;
      if (out.ansi) ansi = out.ansi;
      else if (out.text) ansi = out.text;
      else continue;
      if (el.fg) {
        const bare = ansi.replace(/\x1b\[[0-9;]*m/g, "");
        ansi = `${hexToAnsiFg(el.fg)}${bare}${SGR.RESET}`;
      }
      rendered.push({ ansi });
    }
  }
  if (line.style === "pills") return assemblePillLine(rendered);
  return assemblePlainLine(rendered);
}

function main() {
  const raw = readStdinSync();
  const ctx = parseStdinJson(raw);
  const cfg = loadConfig(CONFIG_PATH);
  const usage = loadUsage();
  const external = { usage };

  const out = [];
  for (const line of cfg.lines) {
    const s = renderLine(line, ctx, external);
    if (s) out.push(s);
  }
  process.stdout.write(out.join("\n") + "\n");
}

try { main(); } catch (err) {
  process.stderr.write(`statusline runtime error: ${err?.message || err}\n`);
  process.stdout.write("\n");
}
