// Builder SPA — state, palette, canvas, autosave, live preview, DnD, inspector.

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  config: null,
  catalog: [],
  selectedPath: null, // [lineIndex, elementIndex]
  saveTimer: null,
};

const SAVE_DEBOUNCE_MS = 250;
const PREVIEW_DEBOUNCE_MS = 100;

async function api(method, path, body) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const r = await fetch(path, init);
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}`);
  if (r.status === 204) return null;
  return r.json();
}

function setSaveStatus(s) {
  const el = $("#save-indicator");
  el.className = s;
  el.textContent = s === "saved" ? "● saved" : s === "dirty" ? "● editing…" : "● error";
}

function scheduleSave() {
  setSaveStatus("dirty");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(async () => {
    try {
      await api("PUT", "/api/config", state.config);
      setSaveStatus("saved");
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    }
  }, SAVE_DEBOUNCE_MS);
}

let previewTimer;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    try {
      const r = await api("POST", "/api/preview", state.config);
      $("#preview-body").innerHTML = r.html || "<span class='dim'>(empty)</span>";
    } catch (e) {
      $("#preview-body").textContent = "preview error: " + e.message;
    }
  }, PREVIEW_DEBOUNCE_MS);
}

function commit() {
  scheduleSave();
  schedulePreview();
}

function renderPalette() {
  const groups = {};
  for (const item of state.catalog) {
    (groups[item.category] ||= []).push(item);
  }
  const wrap = $("#palette-groups");
  wrap.innerHTML = "";
  for (const [category, items] of Object.entries(groups)) {
    const g = document.createElement("div");
    g.className = "palette-group";
    g.innerHTML = `<div class="label">${category}</div>`;
    for (const item of items) {
      const chip = document.createElement("div");
      chip.className = "palette-item";
      chip.textContent = `⋮⋮ ${item.id}`;
      chip.dataset.elementType = item.id;
      chip.draggable = true;
      g.appendChild(chip);
    }
    wrap.appendChild(g);
  }
}

function defaultElementFor(type) {
  const presets = {
    user:           { bg: "#8B73B9", fg: "#ffffff" },
    folder:         { bg: "#D97757", fg: "#000000" },
    git:            { bg: "#E8A88A", fg: "#000000", opts: { showDirty: true, showAheadBehind: true } },
    elapsed:        { bg: "#4682B4", fg: "#ffffff" },
    model:          { bg: "#505050", fg: "#ffffff", opts: { showVersion: true } },
    "session-time": { bg: "#646464", fg: "#ffffff" },
    "question-count": { bg: "#787878", fg: "#ffffff" },
    "context-bar":  { opts: { width: 20 } },
    "rate-limits":  { opts: { show: ["5h", "wk", "sn"] } },
  };
  return { type, ...(presets[type] || { bg: "#333333", fg: "#ffffff" }) };
}

function renderCanvas() {
  const root = $("#lines-container");
  root.innerHTML = "";
  state.config.lines.forEach((line, lineIdx) => {
    const meta = document.createElement("div");
    meta.className = "line-meta";
    meta.innerHTML = `
      <span class="label">Line ${lineIdx + 1}</span>
      <button class="line-style-toggle" data-line="${lineIdx}">${line.style}</button>
      <button class="line-delete" data-line="${lineIdx}">delete</button>
    `;
    root.appendChild(meta);

    const row = document.createElement("div");
    row.className = "line-row";
    row.dataset.line = lineIdx;
    line.elements.forEach((el, elIdx) => {
      const chip = document.createElement("div");
      chip.className = "element-chip" + (line.style === "plain" ? " plain" : "");
      if (line.style === "pills") {
        chip.style.background = el.bg || "#333333";
        chip.style.color = el.fg || "#ffffff";
        // Map capLeft/capRight → CSS border-radius for visual hint in canvas
        const capL = el.capLeft ?? el.capStyle ?? "round";
        const capR = el.capRight ?? el.capStyle ?? "round";
        const rL = capL === "round" ? "12px" : capL === "slant" ? "4px" : "0";
        const rR = capR === "round" ? "12px" : capR === "slant" ? "4px" : "0";
        chip.style.borderRadius = `${rL} ${rR} ${rR} ${rL}`;
      } else if (el.fg) {
        chip.style.color = el.fg;
      }
      chip.textContent = el.type;
      chip.dataset.line = lineIdx;
      chip.dataset.element = elIdx;
      chip.draggable = true;
      const isSelected = state.selectedPath
        && state.selectedPath[0] === lineIdx
        && state.selectedPath[1] === elIdx;
      if (isSelected) chip.classList.add("selected");
      row.appendChild(chip);
    });
    root.appendChild(row);
  });
}

function bindLineMetaButtons() {
  $("#lines-container").addEventListener("click", (ev) => {
    const t = ev.target;
    if (t.classList.contains("line-style-toggle")) {
      const idx = Number(t.dataset.line);
      state.config.lines[idx].style = state.config.lines[idx].style === "pills" ? "plain" : "pills";
      renderCanvas();
      commit();
    } else if (t.classList.contains("line-delete")) {
      const idx = Number(t.dataset.line);
      state.config.lines.splice(idx, 1);
      if (state.selectedPath && state.selectedPath[0] === idx) state.selectedPath = null;
      renderCanvas();
      renderInspector();
      commit();
    }
  });
}

function bindAddLine() {
  $("#add-line").addEventListener("click", () => {
    state.config.lines.push({ style: "plain", elements: [] });
    renderCanvas();
    commit();
  });
}

// ---- Drag and drop ----

function bindDnd() {
  const root = $("#lines-container");
  const palette = $("#palette");

  palette.addEventListener("dragstart", (ev) => {
    const chip = ev.target.closest(".palette-item");
    if (!chip) return;
    ev.dataTransfer.effectAllowed = "copy";
    ev.dataTransfer.setData("application/json", JSON.stringify({
      source: "palette",
      type: chip.dataset.elementType,
    }));
  });

  root.addEventListener("dragstart", (ev) => {
    const chip = ev.target.closest(".element-chip");
    if (!chip) return;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("application/json", JSON.stringify({
      source: "canvas",
      fromLine: Number(chip.dataset.line),
      fromIndex: Number(chip.dataset.element),
    }));
  });

  root.addEventListener("dragover", (ev) => {
    const row = ev.target.closest(".line-row");
    if (!row) return;
    ev.preventDefault();
    row.classList.add("drag-over");
  });
  root.addEventListener("dragleave", (ev) => {
    const row = ev.target.closest(".line-row");
    if (!row) return;
    row.classList.remove("drag-over");
  });
  root.addEventListener("drop", (ev) => {
    const row = ev.target.closest(".line-row");
    if (!row) return;
    ev.preventDefault();
    row.classList.remove("drag-over");
    const targetLine = Number(row.dataset.line);

    let payload;
    try { payload = JSON.parse(ev.dataTransfer.getData("application/json")); }
    catch { return; }

    const chips = $$(".element-chip", row);
    let insertAt = chips.length;
    for (let i = 0; i < chips.length; i++) {
      const r = chips[i].getBoundingClientRect();
      if (ev.clientX < r.left + r.width / 2) {
        insertAt = i;
        break;
      }
    }

    if (payload.source === "palette") {
      const newEl = defaultElementFor(payload.type);
      state.config.lines[targetLine].elements.splice(insertAt, 0, newEl);
    } else if (payload.source === "canvas") {
      const fromLine = payload.fromLine;
      const fromIndex = payload.fromIndex;
      const moved = state.config.lines[fromLine].elements.splice(fromIndex, 1)[0];
      let adjustedInsertAt = insertAt;
      if (fromLine === targetLine && fromIndex < insertAt) adjustedInsertAt -= 1;
      state.config.lines[targetLine].elements.splice(adjustedInsertAt, 0, moved);
      if (state.selectedPath && state.selectedPath[0] === fromLine && state.selectedPath[1] === fromIndex) {
        state.selectedPath = [targetLine, adjustedInsertAt];
      }
    }
    renderCanvas();
    renderInspector();
    commit();
  });
}

// ---- Inspector ----

function selectElement(lineIdx, elIdx) {
  state.selectedPath = [lineIdx, elIdx];
  renderCanvas();
  renderInspector();
}

// Preset color swatches shown under every color picker
const PRESET_COLORS = [
  "#ffffff", "#e8e8e8", "#888888", "#000000",
  "#cc3333", "#d97757", "#f1c40f", "#2ecc71",
  "#26d0ce", "#4682b4", "#7aa2f7", "#8b73b9",
  "#bb9af7", "#ff79c6", "#fab387", "#a6e3a1",
];

const CAP_STYLES = ["round", "slant", "arrow", "square", "none"];

function renderInspector() {
  const body = $("#inspector-body");
  if (!state.selectedPath) {
    body.className = "dim";
    body.textContent = "Click an element to edit it";
    return;
  }
  const [lineIdx, elIdx] = state.selectedPath;
  const line = state.config.lines[lineIdx];
  const el = line?.elements[elIdx];
  if (!el) {
    state.selectedPath = null;
    return renderInspector();
  }
  body.className = "";
  body.innerHTML = "";

  const title = document.createElement("div");
  title.className = "label";
  title.textContent = `${el.type}  ·  line ${lineIdx + 1}`;
  body.appendChild(title);

  if (line.style === "pills") {
    body.appendChild(colorField("Background", el.bg || "#333333", (v) => { el.bg = v; commit(); renderCanvas(); }));
    body.appendChild(colorField("Text",       el.fg || "#ffffff", (v) => { el.fg = v; commit(); renderCanvas(); }));
    body.appendChild(selectField("Cap left",  el.capLeft  ?? el.capStyle ?? "round", CAP_STYLES, (v) => { el.capLeft  = v; commit(); renderCanvas(); }));
    body.appendChild(selectField("Cap right", el.capRight ?? el.capStyle ?? "round", CAP_STYLES, (v) => { el.capRight = v; commit(); renderCanvas(); }));
    body.appendChild(numberField("Gap (spaces)", el.gap ?? 1, 0, 10, (v) => { el.gap = v; commit(); renderCanvas(); }));
  } else {
    // plain — fg only (bg requires SGR wrapping that conflicts with internal renderer colors)
    body.appendChild(colorField("Font color", el.fg || "#ffffff", (v) => { el.fg = v; commit(); renderCanvas(); }));
  }

  const opts = (el.opts ||= {});
  const optsEditor = optsFieldsFor(el.type, opts);
  if (optsEditor) body.appendChild(optsEditor);

  const del = document.createElement("button");
  del.className = "delete-element";
  del.textContent = "Delete element";
  del.onclick = () => {
    line.elements.splice(elIdx, 1);
    state.selectedPath = null;
    renderCanvas();
    renderInspector();
    commit();
  };
  body.appendChild(del);
}

function colorField(label, value, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  input.addEventListener("input",  () => onChange(input.value));
  input.addEventListener("change", () => onChange(input.value));
  const swatches = document.createElement("div");
  swatches.className = "swatches";
  for (const c of PRESET_COLORS) {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "swatch";
    sw.style.background = c;
    sw.title = c;
    sw.addEventListener("click", () => { input.value = c; onChange(c); });
    swatches.appendChild(sw);
  }
  wrap.append(lbl, input, swatches);
  return wrap;
}

function selectField(label, value, options, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  const sel = document.createElement("select");
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    if (o === value) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => onChange(sel.value));
  wrap.append(lbl, sel);
  return wrap;
}

function checkboxField(label, value, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lbl = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!value;
  cb.addEventListener("change", () => onChange(cb.checked));
  lbl.append(cb, " ", document.createTextNode(label));
  wrap.appendChild(lbl);
  return wrap;
}

function numberField(label, value, min, max, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.value = value;
  if (min != null) input.min = String(min);
  if (max != null) input.max = String(max);
  input.addEventListener("input", () => {
    const n = Number(input.value);
    if (!Number.isNaN(n)) onChange(n);
  });
  wrap.append(lbl, input);
  return wrap;
}

function textField(label, value, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.addEventListener("input", () => onChange(input.value));
  wrap.append(lbl, input);
  return wrap;
}

function optsFieldsFor(type, opts) {
  const wrap = document.createElement("div");
  switch (type) {
    case "git":
      wrap.appendChild(checkboxField("Show dirty count",  opts.showDirty !== false,      v => { opts.showDirty = v; commit(); }));
      wrap.appendChild(checkboxField("Show ahead/behind", opts.showAheadBehind !== false, v => { opts.showAheadBehind = v; commit(); }));
      break;
    case "model":
      wrap.appendChild(checkboxField("Show version", opts.showVersion !== false, v => { opts.showVersion = v; commit(); }));
      break;
    case "cost":
      wrap.appendChild(numberField("Precision", opts.precision ?? 4, 0, 6, v => { opts.precision = v; commit(); }));
      break;
    case "context-bar":
      wrap.appendChild(numberField("Width", opts.width ?? 20, 5, 60, v => { opts.width = v; commit(); }));
      break;
    case "rate-limits": {
      const current = (opts.show || ["5h", "wk", "sn"]).join(",");
      wrap.appendChild(textField("Show (csv: 5h,wk,sn,op)", current, v => {
        opts.show = v.split(",").map(s => s.trim()).filter(Boolean);
        commit();
      }));
      break;
    }
    case "session-name":
      wrap.appendChild(numberField("Max length", opts.maxLen ?? 30, 1, 200, v => { opts.maxLen = v; commit(); }));
      break;
    default:
      return null;
  }
  return wrap;
}

function bindCanvasClicks() {
  $("#lines-container").addEventListener("click", (ev) => {
    const chip = ev.target.closest(".element-chip");
    if (!chip) return;
    selectElement(Number(chip.dataset.line), Number(chip.dataset.element));
  });
}

// ---- Themes ----

function applyThemeColors(themeColors) {
  for (const line of state.config.lines) {
    if (line.style !== "pills") continue;
    for (const el of line.elements) {
      const c = themeColors[el.type];
      if (!c) continue;
      if (c.bg) el.bg = c.bg;
      if (c.fg) el.fg = c.fg;
    }
  }
}

async function loadAndApplyTheme(id) {
  if (!id) return;
  try {
    const theme = await api("GET", `/api/themes/${encodeURIComponent(id)}`);
    if (!theme || !theme.colors) return;
    applyThemeColors(theme.colors);
    renderCanvas();
    renderInspector();
    commit();
  } catch (e) {
    console.error("theme apply failed", e);
    setSaveStatus("error");
  }
}

async function saveThemeToServer() {
  const name = prompt("Theme name:");
  if (!name || !name.trim()) return;
  const colors = {};
  for (const line of state.config.lines) {
    if (line.style !== "pills") continue;
    for (const el of line.elements) {
      if (el.bg || el.fg) colors[el.type] = { bg: el.bg, fg: el.fg };
    }
  }
  try {
    const result = await api("POST", "/api/themes", { name: name.trim(), colors });
    // Append new option to the dropdown without full reload
    const sel = $("#theme-select");
    const opt = document.createElement("option");
    opt.value = result.id;
    opt.textContent = name.trim();
    sel.appendChild(opt);
    setSaveStatus("saved");
  } catch (e) {
    console.error("save theme failed", e);
    setSaveStatus("error");
  }
}

function exportCurrentTheme() {
  const colors = {};
  for (const line of state.config.lines) {
    if (line.style !== "pills") continue;
    for (const el of line.elements) {
      if (el.bg || el.fg) {
        colors[el.type] = { bg: el.bg, fg: el.fg };
      }
    }
  }
  const theme = {
    name: "My Theme",
    description: "Exported from statusline builder",
    colors,
  };
  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "statusline-theme.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importThemeFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const theme = JSON.parse(reader.result);
      if (!theme || typeof theme.colors !== "object") {
        throw new Error("missing colors object");
      }
      applyThemeColors(theme.colors);
      renderCanvas();
      renderInspector();
      commit();
    } catch (e) {
      console.error("theme import failed", e);
      setSaveStatus("error");
    }
  };
  reader.readAsText(file);
}

async function bindThemeControls() {
  const sel = $("#theme-select");
  try {
    const themes = await api("GET", "/api/themes");
    for (const t of themes) {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      opt.title = t.description;
      sel.appendChild(opt);
    }
  } catch (e) {
    console.error("theme list failed", e);
  }
  sel.addEventListener("change", () => {
    const id = sel.value;
    if (!id) return;
    loadAndApplyTheme(id);
    // Reset to placeholder so the same theme can be picked again
    setTimeout(() => { sel.value = ""; }, 300);
  });

  $("#theme-save").addEventListener("click", saveThemeToServer);
  $("#theme-export").addEventListener("click", exportCurrentTheme);

  const fileInput = $("#theme-import-file");
  $("#theme-import").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) importThemeFromFile(file);
    fileInput.value = "";
  });
}

// ---- Init ----

async function init() {
  state.config = await api("GET", "/api/config");
  state.catalog = await api("GET", "/api/catalog");
  renderPalette();
  renderCanvas();
  bindLineMetaButtons();
  bindAddLine();
  bindDnd();
  bindCanvasClicks();
  await bindThemeControls();
  setSaveStatus("saved");
  schedulePreview();
}

init().catch(err => {
  $("#preview-body").textContent = "init error: " + err.message;
});
