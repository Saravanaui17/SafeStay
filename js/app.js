"use strict";
/* SafeStay UI. Pure client-side: no backend, no tracking. Location stays on the device unless the user shares it. */
const $ = s => document.querySelector(s);
const h = (t, a, ...c) => {
  const e = document.createElement(t);
  if (a) for (const k in a) { if (k === "class") e.className = a[k]; else if (k.startsWith("on")) e[k] = a[k]; else if (a[k] != null && a[k] !== false) e.setAttribute(k, a[k]); }
  c.flat().forEach(x => x != null && x !== false && e.append(x.nodeType ? x : document.createTextNode(x)));
  return e;
};
const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } } };
const EMO = { flood: "🌧️", storm: "🌀", quake: "🌍", tsunami: "🌊", fire: "🔥", heat: "🌡️", volcano: "🌋", landslide: "⛰️", general: "⚠️" };
const CITIES = [["Chennai", 13.0827, 80.2707], ["Mumbai", 19.076, 72.8777], ["Goa", 15.2993, 74.124], ["Kochi", 9.9312, 76.2673], ["Delhi", 28.6139, 77.209], ["Bangkok", 13.7563, 100.5018], ["Manila", 14.5995, 120.9842], ["Tokyo", 35.6762, 139.6503], ["Los Angeles", 34.0522, -118.2437], ["Miami", 25.7617, -80.1918], ["Istanbul", 41.0082, 28.9784], ["Jakarta", -6.2088, 106.8456]];

const S = {
  lang: store.get("ss_lang", (LANGS[(navigator.language || "en").slice(0, 2)] ? (navigator.language || "en").slice(0, 2) : "en")),
  pos: null, data: null, demo: "", busy: false, kind: "status", guide: "flood"
};
const tr = k => (I18N[S.lang] && I18N[S.lang][k]) ?? I18N.en[k] ?? k;
const trN = (g, k) => (I18N[S.lang][g] && I18N[S.lang][g][k]) ?? I18N.en[g][k] ?? k;
const steps = hz => (I18N[S.lang].G && I18N[S.lang].G[hz]) || I18N.en.G[hz] || I18N.en.G.general;

/* ---------- low-bandwidth detection ---------- */
function isLow() {
  const p = store.get("ss_low", null); if (p !== null) return p === "1";
  const c = navigator.connection;
  return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) || navigator.onLine === false;
}

/* ---------- formatting ---------- */
function fmtDur(ms) {
  const s = Math.round(ms / 1000); if (s < 60) return s + " " + tr("sec");
  const m = Math.round(s / 60); if (m < 90) return m + " " + tr("min");
  const hh = Math.floor(m / 60), mm = m % 60; if (hh < 48) return hh + " h" + (mm ? " " + mm + " " + tr("min") : "");
  return Math.round(hh / 24) + " " + tr("days");
}
function etaText(at) { const l = at - Date.now(); return l <= 45e3 ? tr("now") : tr("in") + " " + fmtDur(l); }
function etaPlain(a) {
  if (a.etaAt) return etaText(a.etaAt);
  if (a.occurredAt) return fmt(tr("occurred"), { t: fmtDur(Date.now() - a.occurredAt) });
  if (a.active) return tr("active");
  return tr("eta_unk");
}
function etaNode(a) { return a.etaAt ? h("span", { class: "eta", "data-at": a.etaAt }, etaText(a.etaAt)) : etaPlain(a); }
const headline = a => a.headline || fmt(tr(a.tpl), a.params);
const hhmm = t => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const emNum = () => (S.pos ? SRC.emergency(S.pos.lat, S.pos.lon) : "112");

/* ---------- cache ---------- */
function saveCache() { const D = S.data; if (D && !D.sim) store.set("ss_cache", JSON.stringify({ pos: S.pos, ts: D.ts, alerts: D.alerts, shelters: D.shelters, higher: D.higher })); }
function loadCache() { try { return JSON.parse(store.get("ss_cache", "null")); } catch (e) { return null; } }

/* ---------- data refresh ---------- */
function setStatus(t) { $("#status").textContent = t; }
async function refresh() {
  if (!S.pos || S.busy) return;
  const { lat, lon } = S.pos, low = isLow(); S.busy = true; S.demo = ""; $("#demo").value = "";
  setStatus(tr("loading")); SRC.timeout = low ? 20000 : 12000;
  const t = p => p.then(v => ({ ok: 1, v }), e => ({ ok: 0, e }));
  const names = ["Open-Meteo", "USGS", "NASA EONET", "NWS", "CAP feed"];
  const R = await Promise.all([t(SRC.weather(lat, lon, low)), t(SRC.usgs(low)), t(SRC.eonet(lat, lon, low)), t(SRC.nws(lat, lon)), t(SRC.customCap())]);
  const [w, q, e, n, c] = R, alerts = []; let elev = null, wind = null;
  if (w.ok) { const r = SRC.fromWeather(w.v, lat, lon); alerts.push(...r.alerts); elev = r.elev; wind = r.wind; }
  if (q.ok) alerts.push(...SRC.fromUSGS(q.v, lat, lon, elev));
  if (e.ok && e.v) alerts.push(...SRC.fromEONET(e.v, lat, lon, wind));
  if (n.ok && n.v) alerts.push(...SRC.fromNWS(n.v, lat, lon));
  if (c.ok && c.v) { try { alerts.push(...CAP.parse(c.v, lat, lon)); } catch (x) { c.ok = 0; } }
  const tried = R.map((r, i) => [r, i]).filter(([r]) => !r.ok || r.v != null), bad = tried.filter(([r]) => !r.ok).map(([, i]) => names[i]);
  if (!w.ok && !q.ok && !e.ok) { // fully offline / blocked
    S.busy = false; const ca = loadCache();
    if (ca) { S.data = Object.assign({ sim: false }, ca); setStatus(tr("offline") + " " + hhmm(ca.ts)); } else setStatus(tr("offline_none"));
    renderOut(); return;
  }
  alerts.forEach(a => { a.lat = lat; a.lon = lon; });
  alerts.sort((a, b) => CAP.sevIdx(b.severity) - CAP.sevIdx(a.severity) || ((a.etaAt || Infinity) - (b.etaAt || Infinity)));
  S.data = { alerts, shelters: [], higher: null, ts: Date.now(), elev, sim: false };
  setStatus("✓ " + lat.toFixed(2) + ", " + lon.toFixed(2) + " · " + tr("updated") + " " + hhmm(S.data.ts) + " · " + (tried.length - bad.length) + "/" + tried.length + " " + tr("sources") + (bad.length ? " · " + bad.join(", ") + " " + tr("failed") : "") + (low ? " · 🐢" : ""));
  saveCache(); renderOut(); S.busy = false;
  if (!low) { // slower extras are fetched after the main result is already on screen
    const need = alerts.some(a => ["flood", "tsunami", "storm"].includes(a.hazard)) && elev != null;
    const [s, g] = await Promise.all([t(SRC.shelters(lat, lon)), need ? t(SRC.higher(lat, lon, elev)) : Promise.resolve({ ok: 0 })]);
    if (S.data && !S.data.sim && S.pos.lat === lat) { if (s.ok) S.data.shelters = s.v; if (g.ok) S.data.higher = g.v; saveCache(); renderOut(); }
  }
}
function setPos(lat, lon) { S.pos = { lat, lon }; store.set("ss_pos", JSON.stringify(S.pos)); refresh(); }
function locate() {
  if (!navigator.geolocation) { setStatus(tr("geo_denied")); return; }
  setStatus(tr("locating"));
  navigator.geolocation.getCurrentPosition(p => setPos(p.coords.latitude, p.coords.longitude), () => {
    const ca = loadCache(); if (ca) { S.pos = ca.pos; S.data = Object.assign({ sim: false }, ca); setStatus(tr("offline") + " " + hhmm(ca.ts)); renderOut(); } else setStatus(tr("geo_denied"));
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
}

/* ---------- demo scenarios (clearly labelled simulations, same pipeline/rendering as live data) ---------- */
function runDemo(kind) {
  if (!kind) { S.demo = ""; S.data = null; if (S.pos) refresh(); else renderOut(); return; }
  S.demo = kind; const b = S.pos || { lat: 13.0827, lon: 80.2707 }, now = Date.now(), H = 3600e3;
  const mk = o => CAP.make(Object.assign({ sim: true, lat: b.lat, lon: b.lon, source: "SafeStay demo", estimated: true, areaDesc: "Demo location" }, o)), A = [];
  if (kind === "flood") A.push(mk({ hazard: "flood", tpl: "t_flood", params: { p: 34, s: 165 }, severity: "Severe", certainty: "Likely", etaAt: now + 2.5 * H, peakAt: now + 6 * H }));
  if (kind === "cyclone") A.push(
    mk({ hazard: "storm", tpl: "t_storm_ev", params: { n: "Cyclone Demo", d: 420, c: "SE" }, severity: "Severe", certainty: "Likely", etaAt: now + 9 * H }),
    mk({ hazard: "storm", tpl: "t_storm", params: { g: 130 }, severity: "Severe", certainty: "Likely", etaAt: now + 11 * H, peakAt: now + 14 * H }),
    mk({ hazard: "flood", tpl: "t_flood", params: { p: 18, s: 210 }, severity: "Moderate", certainty: "Likely", etaAt: now + 10 * H }));
  if (kind === "quake") A.push(
    mk({ hazard: "quake", tpl: "t_quake", params: { m: "7.1", d: 68, pl: "Offshore (demo)" }, severity: "Extreme", certainty: "Observed", urgency: "Immediate", occurredAt: now - 2 * 60e3, source: "USGS (demo)" }),
    mk({ hazard: "tsunami", tpl: "t_tsu", params: { m: "7.1", d: 68 }, severity: "Severe", certainty: "Possible", etaAt: now + 22 * 60e3 }));
  if (kind === "fire") A.push(
    mk({ hazard: "fire", tpl: "t_fire_ev", params: { n: "Hill Fire (demo)", d: 12, c: "NE" }, severity: "Severe", certainty: "Observed", etaAt: now + 2 * H, bearing: 45, source: "NASA EONET (demo)" }),
    mk({ hazard: "fire", tpl: "t_firewx", params: { h: 14, w: 38 }, severity: "Moderate", etaAt: now + 0, active: true }));
  if (kind === "heat") A.push(mk({ hazard: "heat", tpl: "t_heat", params: { a: 47 }, severity: "Severe", certainty: "Likely", active: true, etaAt: null }));
  const sh = [["Govt. Relief Shelter (demo)", 0.9, 30], ["Community Hall (demo)", 1.6, 120], ["General Hospital (demo)", 3.2, 200]].map(x => { const p = SRC.dest(b.lat, b.lon, x[2], x[1]); return { name: x[0], lat: p[0], lon: p[1], d: x[1], kind: "shelter" }; });
  const hp = SRC.dest(b.lat, b.lon, 315, 1.5);
  S.data = { alerts: A, shelters: sh, higher: ["flood", "cyclone", "quake"].includes(kind) ? { brg: 315, d: 1.5, gain: 22, lat: hp[0], lon: hp[1] } : null, ts: now, sim: true };
  if (!S.pos) S.pos = { lat: b.lat, lon: b.lon };
  setStatus(tr("sim")); renderOut();
}

/* ---------- views ---------- */
function mapsLink(o, d) { return "https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=" + o.lat + "," + o.lon + "&destination=" + d.lat + "," + d.lon; }
function stepsList(hz) { return h("ol", { class: "steps" }, steps(hz).map(s => h("li", null, s))); }

function alertCard(a, open) {
  const sev = CAP.sevIdx(a.severity), hdr = h("summary", null,
    h("span", { class: "chip s" + sev }, trN("sev", a.severity)), " ", EMO[a.hazard] + " " + trN("hz", a.hazard), " · ", h("b", null, etaNode(a)));
  const tag = a.official ? tr("official") : a.estimated ? tr("est") : tr("forecast");
  const body = h("div", { class: "abody" },
    h("div", { class: "hl" }, headline(a)),
    h("div", { class: "mu" }, tag + " · " + a.source + (a.peakAt && a.etaAt ? " · " + tr("peak_in") + " " + fmtDur(a.peakAt - Date.now()) : "")),
    h("div", { class: "phase" }, tr(a.urgency === "Immediate" || a.active ? "do_now" : "prepare")),
    stepsList(a.hazard),
    a.official && a.instruction ? h("div", { class: "off" }, h("b", null, tr("official_instr") + ": "), a.instruction) : null,
    h("button", { class: "lnk", onclick: () => downloadCap(a) }, "⬇ " + tr("cap_dl")));
  return h("details", { class: "acard s" + sev, open: open ? "" : null }, hdr, body);
}
function downloadCap(a) {
  const u = URL.createObjectURL(new Blob([CAP.xml(a)], { type: "application/cap+xml" })), l = h("a", { href: u, download: "safestay-" + a.hazard + ".cap.xml" });
  document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}

function liteText() {
  const D = S.data, A = D.alerts, L = [];
  L.push("SAFESTAY " + hhmm(D.ts) + (S.pos ? "  " + S.pos.lat.toFixed(3) + "," + S.pos.lon.toFixed(3) : "") + (D.sim ? "  [SIMULATION]" : ""));
  if (!A.length) L.push(tr("all_clear_short"));
  A.slice(0, 3).forEach((a, i) => {
    L.push("", (i + 1) + ") " + trN("sev", a.severity).toUpperCase() + " " + trN("hz", a.hazard) + " – " + etaPlain(a), "   " + headline(a));
    steps(a.hazard).slice(0, 3).forEach((s, j) => L.push("   " + (j + 1) + ". " + s));
  });
  L.push("", tr("emergency") + ": " + emNum());
  return L.join("\n");
}
function copyText(txt, btn) {
  const done = () => { const o = btn.textContent; btn.textContent = tr("copied"); setTimeout(() => (btn.textContent = o), 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, done); else { const t = h("textarea"); t.value = txt; document.body.append(t); t.select(); try { document.execCommand("copy"); } catch (e) { /* ignore */ } t.remove(); done(); }
}

function escapeCard(D) {
  const top = D.alerts[0], rows = [];
  if (top && top.bearing != null && ["fire", "volcano"].includes(top.hazard)) rows.push(h("div", { class: "row1" }, "🧭 " + fmt(tr("away"), { c: SRC.compass((top.bearing + 180) % 360) })));
  if (D.higher && S.pos) rows.push(h("div", { class: "row1" }, "⛰️ " + fmt(tr("higher"), { d: D.higher.d, c: SRC.compass(D.higher.brg), g: D.higher.gain }), " ", h("a", { href: mapsLink(S.pos, D.higher), target: "_blank", rel: "noopener" }, tr("dir") + " ↗")));
  if (D.shelters && D.shelters.length) {
    rows.push(h("div", { class: "mu", style: "margin-top:8px" }, tr("shelters")));
    D.shelters.forEach(x => rows.push(h("div", { class: "sh" }, h("div", null, x.name, h("div", { class: "mu" }, x.d.toFixed(1) + " km · ~" + Math.round(x.d / 5 * 60) + " " + tr("walk"))), h("a", { href: mapsLink(S.pos, x), target: "_blank", rel: "noopener" }, tr("dir") + " ↗"))));
  }
  return rows.length ? h("section", { class: "card" }, h("h3", null, "🏃 " + tr("escape")), rows) : null;
}

/* family broadcast */
const contacts = () => { try { return JSON.parse(store.get("ss_contacts", "[]")); } catch (e) { return []; } };
function buildMsg(kind) {
  const p = S.pos, D = S.data, top = D && D.alerts[0];
  const L = [tr("fm_" + kind), "📍 https://maps.google.com/?q=" + p.lat.toFixed(5) + "," + p.lon.toFixed(5), hhmm(Date.now())];
  if (top) L.push(trN("hz", top.hazard) + " (" + trN("sev", top.severity) + "): " + etaPlain(top));
  if (D && D.sim) L.push("[SIMULATION]");
  return L.join("\n");
}
function familyCard() {
  const c = h("section", { class: "card" }, h("h3", null, "👪 " + tr("family")), h("div", { class: "mu" }, tr("fam_hint")));
  if (!S.pos) { c.append(h("div", { class: "mu" }, tr("nolocation"))); return c; }
  const prev = h("pre", { class: "msg" }, buildMsg(S.kind));
  const kinds = h("div", { class: "row" }, [["safe", "✅ " + tr("safe")], ["help", "🆘 " + tr("help")], ["status", "ℹ️ " + tr("status")]].map(([k, l]) =>
    h("button", { class: "kb" + (S.kind === k ? " on" : ""), onclick: () => { S.kind = k; renderOut(); } }, l)));
  const msg = buildMsg(S.kind), enc = encodeURIComponent(msg);
  const act = h("div", { class: "row" },
    navigator.share ? h("button", { class: "p", onclick: () => navigator.share({ text: msg }).catch(() => { }) }, tr("share")) : null,
    h("a", { class: "btn", href: "https://wa.me/?text=" + enc, target: "_blank", rel: "noopener" }, tr("wa")),
    h("button", { onclick: e => copyText(msg, e.target) }, tr("copy")));
  c.append(kinds, prev, act);
  const list = contacts();
  if (list.length) c.append(h("div", { class: "row" }, list.map((x, i) => h("span", { class: "ct" },
    h("a", { class: "btn", href: "sms:" + x.phone + "?&body=" + enc }, "✉️ " + tr("sms_to") + " " + x.name),
    h("button", { class: "x", "aria-label": "remove", onclick: () => { list.splice(i, 1); store.set("ss_contacts", JSON.stringify(list)); renderOut(); } }, "✕")))));
  const nm = h("input", { placeholder: tr("c_name"), "aria-label": tr("c_name") }), ph = h("input", { placeholder: tr("c_phone"), inputmode: "tel", "aria-label": tr("c_phone") });
  c.append(h("div", { class: "mu", style: "margin-top:8px" }, tr("contacts")), h("div", { class: "row" }, nm, ph, h("button", {
    onclick: () => { if (nm.value.trim() && ph.value.trim()) { list.push({ name: nm.value.trim(), phone: ph.value.trim().replace(/[^\d+]/g, "") }); store.set("ss_contacts", JSON.stringify(list)); renderOut(); } }
  }, tr("add"))));
  return c;
}

function guidesCard() {
  const sel = h("select", { "aria-label": tr("guides_title"), onchange: e => { S.guide = e.target.value; box.textContent = ""; box.append(stepsList(S.guide)); } },
    Object.keys(I18N.en.hz).map(k => h("option", { value: k, selected: k === S.guide ? "" : null }, EMO[k] + " " + trN("hz", k))));
  const box = h("div", null, stepsList(S.guide));
  return h("section", { class: "card" }, h("h3", null, "📘 " + tr("guides_title")), sel, box);
}

function renderOut() {
  const out = $("#out"), D = S.data, lite = isLow(); out.textContent = "";
  document.body.classList.toggle("lite", lite);
  if (!D) { out.append(h("div", { class: "card mu" }, tr("start")), guidesCard(), emBtn()); return; }
  const A = D.alerts, top = A[0];
  if (D.sim) out.append(h("div", { class: "simtag" }, "🧪 " + tr("sim")));
  if (lite) {
    const pre = h("pre", { class: "litepre" }, liteText());
    out.append(h("section", { class: "card" }, pre, h("button", { class: "p", onclick: e => copyText(liteText(), e.target) }, tr("summary_copy"))));
  } else {
    if (!top) out.append(h("div", { class: "banner s0" }, h("div", { class: "bh" }, "✅ " + tr("all_clear")), h("div", null, tr("all_clear_note"))));
    else out.append(h("div", { class: "banner s" + CAP.sevIdx(top.severity) }, h("div", { class: "bh" }, EMO[top.hazard] + " " + trN("hz", top.hazard) + " · " + trN("sev", top.severity)), h("div", { class: "big" }, etaNode(top)), h("div", null, headline(top))));
    A.forEach((a, i) => out.append(alertCard(a, i === 0)));
    const e = escapeCard(D); if (e) out.append(e);
  }
  out.append(emBtn(), familyCard(), guidesCard());
  out.append(h("details", { class: "card" }, h("summary", null, "⚙️ " + tr("settings")), h("div", { class: "mu" }, tr("cap_url")),
    (() => { const i = h("input", { value: store.get("ss_cap", ""), placeholder: "https://…/alert.xml", "aria-label": tr("cap_url") }); return h("div", { class: "row" }, i, h("button", { onclick: e => { store.set("ss_cap", i.value.trim()); e.target.textContent = tr("saved"); } }, tr("save"))); })()));
  out.append(h("div", { class: "mu foot" }, tr("footer")));
}
const emBtn = () => h("a", { class: "sos", href: "tel:" + emNum().split(" ")[0] }, "📞 " + tr("emergency") + ": " + emNum());

/* ---------- static controls ---------- */
function applyStatic() {
  document.documentElement.lang = S.lang;
  $("#tag").textContent = tr("tag"); $("#loc").textContent = tr("locate"); $("#lowl").textContent = tr("low"); $("#lowh").textContent = tr("low_hint");
  const city = $("#city"); city.textContent = ""; city.append(h("option", { value: "" }, tr("city")), ...CITIES.map(c => h("option", { value: c[1] + "," + c[2] }, c[0])));
  const demo = $("#demo"), cur = S.demo; demo.textContent = "";
  demo.append(h("option", { value: "" }, tr("demo_none")), ...["flood", "cyclone", "quake", "fire", "heat"].map(k => h("option", { value: k }, tr("demo_lbl") + k)));
  demo.value = cur; $("#low").checked = isLow();
}
function init() {
  const lang = $("#lang"); Object.keys(LANGS).forEach(k => lang.append(h("option", { value: k }, LANGS[k]))); lang.value = S.lang;
  lang.onchange = e => { S.lang = e.target.value; store.set("ss_lang", S.lang); applyStatic(); renderOut(); };
  $("#loc").onclick = locate;
  $("#city").onchange = e => { if (e.target.value) { const [a, b] = e.target.value.split(",").map(Number); setPos(a, b); } };
  $("#demo").onchange = e => runDemo(e.target.value);
  $("#low").onchange = e => { store.set("ss_low", e.target.checked ? "1" : "0"); applyStatic(); renderOut(); if (S.pos && !S.demo) refresh(); };
  applyStatic();
  const q = new URLSearchParams(location.search);
  try { S.pos = JSON.parse(store.get("ss_pos", "null")); } catch (e) { S.pos = null; }
  if (q.get("demo")) { runDemo(q.get("demo")); $("#demo").value = q.get("demo"); }
  else if (S.pos) { const ca = loadCache(); if (ca) { S.data = Object.assign({ sim: false }, ca); setStatus(tr("offline") + " " + hhmm(ca.ts)); } renderOut(); refresh(); }
  else renderOut();
  setInterval(() => document.querySelectorAll(".eta").forEach(n => (n.textContent = etaText(+n.dataset.at))), 1000);
  setInterval(() => { if (S.pos && !S.demo && !document.hidden) refresh(); }, 5 * 60e3);
  window.addEventListener("online", () => { if (S.pos && !S.demo) refresh(); });
  window.addEventListener("offline", () => { applyStatic(); renderOut(); });
  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => { });
}
document.addEventListener("DOMContentLoaded", init);
