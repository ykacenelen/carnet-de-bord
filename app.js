(() => {
  "use strict";

  /* ---------------- Storage ---------------- */
  const LS_ENTRIES = "carnet_entries_v1";
  const LS_CATS = "carnet_categories_v1";
  const LS_CATCOLORS = "carnet_category_colors_v1";

  const DEFAULT_CATS = ["Bricolage", "IA", "Renfo", "Travail", "Sport", "Lecture", "Famille", "Trajet", "Autre"];
  const PALETTE = ["#35634F", "#A6702E", "#3E5C76", "#8C4A6B", "#5B7A3A", "#9C4132", "#4A6E6A", "#7A5C3E"];

  function loadEntries() {
    try { return JSON.parse(localStorage.getItem(LS_ENTRIES)) || []; }
    catch { return []; }
  }
  function saveEntries(list) { localStorage.setItem(LS_ENTRIES, JSON.stringify(list)); }

  function loadCats() {
    try {
      const c = JSON.parse(localStorage.getItem(LS_CATS));
      if (Array.isArray(c) && c.length) return c;
    } catch {}
    saveCats(DEFAULT_CATS);
    return DEFAULT_CATS.slice();
  }
  function saveCats(list) { localStorage.setItem(LS_CATS, JSON.stringify(list)); }

  function loadCatColors() {
    try { return JSON.parse(localStorage.getItem(LS_CATCOLORS)) || {}; }
    catch { return {}; }
  }
  function saveCatColors(map) { localStorage.setItem(LS_CATCOLORS, JSON.stringify(map)); }

  let entries = loadEntries();
  let categories = loadCats();
  let catColors = loadCatColors();

  function hashColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  function catColor(name) {
    return catColors[name] || hashColor(name);
  }

  /* ---------------- Helpers ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const pad2 = (n) => String(n).padStart(2, "0");

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function nowHHMM() {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  // duration in minutes, handles crossing midnight
  function durationMinutes(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return mins;
  }
  function fmtDuration(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h} h ${pad2(m)}` : `${m} min`;
  }
  function fmtDurationShort(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h}h${pad2(m)}`;
  }

  function fmtDateLabel(iso) {
    const d = new Date(iso + "T00:00:00");
    const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._tm);
    toast._tm = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---------------- Header date ---------------- */
  $("#todayLabel").textContent = fmtDateLabel(todayISO());

  /* ---------------- Tabs ---------------- */
  function switchView(name) {
    $$(".view").forEach(v => v.classList.remove("active"));
    $(`#view-${name}`).classList.add("active");
    $$(".tabbar button").forEach(b => b.classList.toggle("active", b.dataset.view === name));
    if (name === "bord") renderDashboard();
  }
  $$(".tabbar button").forEach(b => b.addEventListener("click", () => switchView(b.dataset.view)));

  /* ---------------- Category select population ---------------- */
  function populateCatSelect(selectEl, selected) {
    selectEl.innerHTML = "";
    categories.forEach(c => {
      const o = document.createElement("option");
      o.value = c; o.textContent = c;
      selectEl.appendChild(o);
    });
    const addOpt = document.createElement("option");
    addOpt.value = "__add__";
    addOpt.textContent = "+ Nouvelle catégorie…";
    selectEl.appendChild(addOpt);
    if (selected && categories.includes(selected)) selectEl.value = selected;
  }

  populateCatSelect($("#f-cat"));
  populateCatSelect($("#e-cat"));

  $("#f-cat").addEventListener("change", () => {
    const row = $("#catAddRow");
    if ($("#f-cat").value === "__add__") { row.hidden = false; $("#f-newcat").focus(); }
    else row.hidden = true;
  });
  $("#catAddConfirm").addEventListener("click", () => {
    const val = $("#f-newcat").value.trim();
    if (!val) return;
    if (!categories.includes(val)) { categories.push(val); saveCats(categories); }
    populateCatSelect($("#f-cat"), val);
    populateCatSelect($("#e-cat"));
    $("#catAddRow").hidden = true;
    $("#f-newcat").value = "";
  });

  /* ---------------- Entry form (Saisie) ---------------- */
  function resetForm() {
    $("#f-date").value = todayISO();
    $("#f-start").value = nowHHMM();
    $("#f-end").value = nowHHMM();
    populateCatSelect($("#f-cat"));
    $("#catAddRow").hidden = true;
    $("#f-desc").value = "";
    updateDurationPreview();
  }

  function updateDurationPreview() {
    const s = $("#f-start").value, e = $("#f-end").value;
    const p = $("#durationPreview");
    if (!s || !e) { p.textContent = ""; return; }
    const mins = durationMinutes(s, e);
    if (mins === 0) { p.textContent = "Durée nulle — vérifie les horaires."; p.classList.add("warn"); return; }
    p.classList.remove("warn");
    p.textContent = `Durée : ${fmtDuration(mins)}` + (mins > 720 ? " (passe minuit ?)" : "");
  }
  $("#f-start").addEventListener("input", updateDurationPreview);
  $("#f-end").addEventListener("input", updateDurationPreview);

  $("#entryForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const cat = $("#f-cat").value;
    if (cat === "__add__") { toast("Ajoute d'abord la nouvelle catégorie"); return; }
    const entry = {
      id: uid(),
      date: $("#f-date").value,
      start: $("#f-start").value,
      end: $("#f-end").value,
      category: cat,
      desc: $("#f-desc").value.trim()
    };
    entries.push(entry);
    saveEntries(entries);
    toast("Activité enregistrée");
    resetForm();
    if ($("#view-bord").classList.contains("active")) renderDashboard();
  });

  /* ---------------- Dashboard ---------------- */
  let currentPeriod = "today";

  $("#periodFilters").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-period]");
    if (!btn) return;
    currentPeriod = btn.dataset.period;
    $$("#periodFilters button").forEach(b => b.classList.toggle("active", b === btn));
    renderDashboard();
  });

  function periodBounds(period) {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    if (period === "today") return { from: start, to: null };
    if (period === "week") { const f = new Date(start); f.setDate(f.getDate() - 6); return { from: f, to: null }; }
    if (period === "month") { const f = new Date(start.getFullYear(), start.getMonth(), 1); return { from: f, to: null }; }
    return { from: null, to: null }; // all
  }

  function filteredEntries() {
    const { from } = periodBounds(currentPeriod);
    let list = entries.slice();
    if (from) {
      const fromISO = `${from.getFullYear()}-${pad2(from.getMonth() + 1)}-${pad2(from.getDate())}`;
      list = list.filter(e => e.date >= fromISO);
    }
    list.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    return list;
  }

  function renderDashboard() {
    const list = filteredEntries();

    // summary
    const totalMins = list.reduce((s, e) => s + durationMinutes(e.start, e.end), 0);
    $("#totalTime").textContent = fmtDuration(totalMins);
    $("#entryCount").textContent = `${list.length} activité${list.length > 1 ? "s" : ""}`;

    // chart: total per category
    const byCat = {};
    list.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + durationMinutes(e.start, e.end); });
    const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const max = catEntries.length ? catEntries[0][1] : 1;

    const chartEl = $("#chart");
    chartEl.innerHTML = "";
    catEntries.forEach(([cat, mins]) => {
      const row = document.createElement("div");
      row.className = "chart-row";
      row.innerHTML = `
        <div class="label">${escapeHtml(cat)}</div>
        <div class="track"><div class="fill" style="width:${Math.max(4, Math.round(mins / max * 100))}%; background:${catColor(cat)}"></div></div>
        <div class="val">${fmtDurationShort(mins)}</div>`;
      chartEl.appendChild(row);
    });

    // list grouped by day (most recent day first, entries within a day chronological)
    const listEl = $("#logList");
    listEl.innerHTML = "";

    if (!list.length) {
      listEl.innerHTML = `<div class="empty"><div class="glyph">—</div><p>Aucune activité sur cette période.<br>Ouvre l'onglet Saisie pour en ajouter une.</p></div>`;
      renderCatManager();
      return;
    }

    const byDay = {};
    list.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });
    const days = Object.keys(byDay).sort().reverse();
    const collapsible = currentPeriod !== "today";
    const chevSvg = `<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    days.forEach(day => {
      const dayEntries = byDay[day].slice().sort((a, b) => b.start.localeCompare(a.start));
      const dayTotal = dayEntries.reduce((s, e) => s + durationMinutes(e.start, e.end), 0);
      const titleText = `${fmtDateLabel(day)} · ${fmtDurationShort(dayTotal)}`;

      const group = document.createElement(collapsible ? "details" : "div");
      group.className = "day-group";

      if (collapsible) {
        group.innerHTML = `<summary class="day-title"><span>${titleText}</span>${chevSvg}</summary>`;
      } else {
        group.innerHTML = `<div class="day-title">${titleText}</div>`;
      }

      const logEl = document.createElement("div");
      logEl.className = "log";

      dayEntries.forEach(e => {
        const mins = durationMinutes(e.start, e.end);
        const card = document.createElement("div");
        card.className = "entry";
        card.dataset.id = e.id;
        card.innerHTML = `
          <span class="time">${e.start} – ${e.end}</span><span class="dur">${fmtDuration(mins)}</span>
          ${e.desc ? `<div class="desc">${escapeHtml(e.desc)}</div>` : ""}
          <div class="meta">
            <span class="chip" style="background:${catColor(e.category)}22; color:${catColor(e.category)}">
              <span class="sw" style="background:${catColor(e.category)}"></span>${escapeHtml(e.category)}
            </span>
          </div>`;
        card.addEventListener("click", () => openEdit(e.id));
        logEl.appendChild(card);
      });
      group.appendChild(logEl);
      listEl.appendChild(group);
    });

    renderCatManager();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------------- Edit modal ---------------- */
  let editingId = null;

  function openEdit(id) {
    const e = entries.find(x => x.id === id);
    if (!e) return;
    editingId = id;
    $("#e-date").value = e.date;
    $("#e-start").value = e.start;
    $("#e-end").value = e.end;
    populateCatSelect($("#e-cat"), e.category);
    $("#e-desc").value = e.desc || "";
    updateEditDurationPreview();
    $("#editOverlay").classList.add("active");
  }
  function closeEdit() { $("#editOverlay").classList.remove("active"); editingId = null; }

  $("#editClose").addEventListener("click", closeEdit);
  $("#editOverlay").addEventListener("click", (ev) => { if (ev.target === $("#editOverlay")) closeEdit(); });

  function updateEditDurationPreview() {
    const s = $("#e-start").value, e = $("#e-end").value;
    const p = $("#editDurationPreview");
    if (!s || !e) { p.textContent = ""; return; }
    const mins = durationMinutes(s, e);
    p.textContent = mins === 0 ? "Durée nulle — vérifie les horaires." : `Durée : ${fmtDuration(mins)}`;
    p.classList.toggle("warn", mins === 0);
  }
  $("#e-start").addEventListener("input", updateEditDurationPreview);
  $("#e-end").addEventListener("input", updateEditDurationPreview);

  $("#editForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!editingId) return;
    const idx = entries.findIndex(x => x.id === editingId);
    if (idx === -1) return;
    const cat = $("#e-cat").value;
    entries[idx] = {
      ...entries[idx],
      date: $("#e-date").value,
      start: $("#e-start").value,
      end: $("#e-end").value,
      category: cat === "__add__" ? entries[idx].category : cat,
      desc: $("#e-desc").value.trim()
    };
    saveEntries(entries);
    toast("Modifications enregistrées");
    closeEdit();
    renderDashboard();
  });

  $("#editDelete").addEventListener("click", () => {
    if (!editingId) return;
    if (!confirm("Supprimer cette activité ?")) return;
    entries = entries.filter(x => x.id !== editingId);
    saveEntries(entries);
    toast("Activité supprimée");
    closeEdit();
    renderDashboard();
  });

  /* ---------------- Category management (rename + color) ---------------- */
  function renderCatManager() {
    const container = $("#catManageList");
    if (!container) return;
    container.innerHTML = "";
    const chevSvg = `<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    categories.forEach(cat => {
      const color = catColor(cat);
      const det = document.createElement("details");
      det.className = "cat-row";
      det.dataset.cat = cat;
      det.dataset.color = color;

      const swatches = PALETTE.map(c =>
        `<button type="button" class="swatch-btn${c.toLowerCase() === color.toLowerCase() ? " selected" : ""}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`
      ).join("");

      det.innerHTML = `
        <summary>
          <span class="cat-swatch" style="background:${color}"></span>
          <span class="cat-row-name">${escapeHtml(cat)}</span>
          ${chevSvg}
        </summary>
        <div class="cat-editor">
          <div class="field">
            <label>Nom</label>
            <input type="text" class="cat-rename-input" value="${escapeHtml(cat)}">
          </div>
          <div class="field">
            <label>Couleur</label>
            <div class="swatch-palette">
              ${swatches}
              <span class="custom-color-wrap" style="background:${color}">
                <input type="color" class="cat-custom-color" value="${color}">
              </span>
            </div>
          </div>
          <div class="btn-row" style="margin-top:14px;">
            <button type="button" class="btn btn-ghost cat-cancel">Annuler</button>
            <button type="button" class="btn btn-primary cat-save">Enregistrer</button>
          </div>
        </div>`;
      container.appendChild(det);
    });
  }

  $("#catManageList").addEventListener("click", (ev) => {
    const det = ev.target.closest("details.cat-row");
    if (!det) return;

    const swatchBtn = ev.target.closest(".swatch-btn");
    if (swatchBtn) {
      det.dataset.color = swatchBtn.dataset.color;
      det.querySelectorAll(".swatch-btn").forEach(b => b.classList.toggle("selected", b === swatchBtn));
      det.querySelector(".custom-color-wrap").style.background = swatchBtn.dataset.color;
      det.querySelector(".cat-custom-color").value = swatchBtn.dataset.color;
      return;
    }

    if (ev.target.closest(".cat-cancel")) {
      det.open = false;
      return;
    }

    if (ev.target.closest(".cat-save")) {
      const oldName = det.dataset.cat;
      const newName = det.querySelector(".cat-rename-input").value;
      const color = det.dataset.color;
      const ok = renameCategory(oldName, newName, color);
      if (ok) {
        det.open = false;
        populateCatSelect($("#f-cat"));
        populateCatSelect($("#e-cat"));
        renderDashboard();
        toast("Catégorie mise à jour");
      }
    }
  });

  $("#catManageList").addEventListener("input", (ev) => {
    if (ev.target.classList.contains("cat-custom-color")) {
      const det = ev.target.closest("details.cat-row");
      const color = ev.target.value;
      det.dataset.color = color;
      det.querySelector(".custom-color-wrap").style.background = color;
      det.querySelectorAll(".swatch-btn").forEach(b => b.classList.toggle("selected", b.dataset.color.toLowerCase() === color.toLowerCase()));
    }
  });

  function renameCategory(oldName, newNameRaw, color) {
    const newName = (newNameRaw || "").trim();
    if (!newName) { toast("Le nom ne peut pas être vide"); return false; }
    if (newName === "__add__") { toast("Ce nom n'est pas autorisé"); return false; }

    const isRename = newName !== oldName;
    const mergeTarget = isRename && categories.includes(newName);

    if (isRename) {
      if (mergeTarget) {
        const ok = confirm(`"${newName}" existe déjà. Fusionner "${oldName}" avec "${newName}" ? Les activités de "${oldName}" seront réaffectées à "${newName}".`);
        if (!ok) return false;
        categories = categories.filter(c => c !== oldName);
        delete catColors[oldName];
      } else {
        const idx = categories.indexOf(oldName);
        if (idx !== -1) categories[idx] = newName;
        if (catColors[oldName]) { catColors[newName] = catColors[oldName]; delete catColors[oldName]; }
      }
      entries.forEach(e => { if (e.category === oldName) e.category = newName; });
      saveEntries(entries);
    }

    if (color) catColors[newName] = color;

    saveCats(categories);
    saveCatColors(catColors);
    return true;
  }

  /* ---------------- Export / Import ---------------- */
  function csvEscape(v) {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function downloadBlob(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportCSV() {
    const list = filteredEntries();
    if (!list.length) { toast("Rien à exporter sur cette période"); return; }
    const header = ["Date", "Début", "Fin", "Durée (min)", "Durée", "Catégorie", "Description"];
    const rows = list.map(e => {
      const mins = durationMinutes(e.start, e.end);
      return [e.date, e.start, e.end, mins, fmtDuration(mins), e.category, e.desc || ""];
    });
    // ';' delimiter + BOM: opens correctly with accents in Excel FR
    const csv = "\uFEFF" + [header, ...rows].map(r => r.map(csvEscape).join(";")).join("\r\n");
    downloadBlob(`carnet-de-bord_${currentPeriod}_${todayISO()}.csv`, csv, "text/csv;charset=utf-8");
    toast("Export CSV téléchargé");
  }

  function exportJSONBackup() {
    const payload = { app: "carnet-de-bord", version: 1, exportedAt: new Date().toISOString(), categories, categoryColors: catColors, entries };
    downloadBlob(`carnet-de-bord_sauvegarde_${todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json");
    toast("Sauvegarde JSON téléchargée");
  }

  function importJSONBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch { toast("Fichier illisible : JSON invalide"); return; }
      if (!data || !Array.isArray(data.entries)) { toast("Format de sauvegarde non reconnu"); return; }

      const existingIds = new Set(entries.map(e => e.id));
      let added = 0, skipped = 0;
      data.entries.forEach(e => {
        if (!e || !e.date || !e.start || !e.end || !e.category) { skipped++; return; }
        const id = e.id || uid();
        if (existingIds.has(id)) { skipped++; return; }
        entries.push({ id, date: e.date, start: e.start, end: e.end, category: e.category, desc: e.desc || "" });
        existingIds.add(id);
        added++;
      });

      if (Array.isArray(data.categories)) {
        data.categories.forEach(c => { if (c && !categories.includes(c)) categories.push(c); });
        saveCats(categories);
      }
      if (data.categoryColors && typeof data.categoryColors === "object") {
        Object.entries(data.categoryColors).forEach(([cat, color]) => {
          if (typeof color === "string" && !catColors[cat]) catColors[cat] = color;
        });
        saveCatColors(catColors);
      }
      saveEntries(entries);
      populateCatSelect($("#f-cat"));
      populateCatSelect($("#e-cat"));
      toast(`${added} activité${added > 1 ? "s" : ""} importée${added > 1 ? "s" : ""}` + (skipped ? `, ${skipped} ignorée(s)` : ""));
      renderDashboard();
    };
    reader.readAsText(file, "utf-8");
  }

  $("#btnExportCsv").addEventListener("click", exportCSV);
  $("#btnExportJson").addEventListener("click", exportJSONBackup);
  $("#btnImportJson").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const ok = confirm("La restauration fusionne ce fichier avec les données déjà présentes (les identifiants en double sont ignorés, rien n'est écrasé). Continuer ?");
    if (ok) importJSONBackup(file);
    ev.target.value = "";
  });

  /* ---------------- Service worker ---------------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  /* ---------------- Init ---------------- */
  resetForm();
})();
