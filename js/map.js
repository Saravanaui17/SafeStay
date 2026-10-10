"use strict";
/* Map view + safe-place ranking.
   - Leaflet is loaded lazily, AFTER the text result is already on screen, so weak connections get the text first.
   - In low-bandwidth mode the map is never loaded unless the person taps "Load map".
   - Everything drawn from OpenStreetMap / feed data is built with DOM nodes (never HTML strings): names are untrusted.
   Uses globals from app.js (h, tr, trN, S, EMO, headline, etaPlain, hhmm, mapsLink, placeName, renderOut). */
const MAP = {
  JS: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js",
  CSS: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css",
  SEV_COL: ["#7a8794", "#2e7d9a", "#c58a00", "#d9642b", "#b71c1c"],
  WALK_KMH: 5, DETOUR: 1.3, // straight-line -> walking distance factor when no real route is available
  INDOOR: ["shelter", "community_centre", "townhall", "library", "hospital"],
  node: null, map: null, layer: null, ready: null, tick: 0, key: "", hazB: null, plcB: null, radar: null, timer: 0,

  /* ---------- ranking ---------- */
  /** Minutes-equivalent bonus (negative) / penalty (positive) of candidate c for alert a, plus the reason string key. */
  adjust(a, c, pos) {
    let v = 0, why = null;
    const pick = (dv, key) => { v += dv; if (dv < 0 && (!why || dv < why[0])) why = [dv, key]; };
    const k = c.kind, hz = a.hazard, gain = c.gain;
    if (hz === "flood" || hz === "tsunami" || hz === "cyclone") {
      const tsu = hz === "tsunami";
      if (k === "higher") pick(tsu ? -10 : -5, "why_high"); // a bare high-ground point should not outrank a real shelter that is also high
      else if (gain != null) { if (gain >= 10) pick(tsu ? -15 : -8, "why_high"); else if (gain <= -3) v += tsu ? 20 : 10; }
      if (hz === "cyclone") { if (["shelter", "community_centre", "hospital"].includes(k)) pick(-3, "why_sturdy"); else if (k === "assembly_point") v += 8; }
    } else if (hz === "quake") {
      if (k === "assembly_point") pick(-6, "why_open"); else if (["library", "townhall", "community_centre"].includes(k)) v += 4;
    } else if (["heat", "cold", "dust", "storm"].includes(hz)) {
      if (MAP.INDOOR.includes(k)) pick(-4, "why_indoor"); else if (k === "assembly_point") v += hz === "storm" ? 10 : 8; else if (k === "higher") v += 6;
    } else if (["fire", "volcano", "landslide"].includes(hz)) {
      if (a.bearing != null) {
        const dl = SRC.angDiff(SRC.bearing(pos.lat, pos.lon, c.lat, c.lon), a.bearing);
        if (dl < 60) v += 15; else if (dl > 120) pick(-6, "why_away");
      }
      if (a.evLat != null) {
        const dc = SRC.hav(c.lat, c.lon, a.evLat, a.evLon), du = SRC.hav(pos.lat, pos.lon, a.evLat, a.evLon);
        if (dc < du) v += 10; else if (dc > du + 0.5) pick(-3, "why_away");
      }
    }
    return [v, why];
  },

  /** Rank candidate safe places (D.shelters + D.higher) by walking time and fit to the active hazard types. */
  async rank(D, pos, opt) {
    opt = opt || {};
    const cands = (D.shelters || []).map(x => ({ name: x.name, kind: x.kind, lat: x.lat, lon: x.lon, d: x.d, gain: x.gain == null ? null : x.gain }));
    if (D.higher) cands.push({ name: "", kind: "higher", lat: D.higher.lat, lon: D.higher.lon, d: D.higher.d, gain: D.higher.gain });
    if (!cands.length) return [];
    cands.sort((p, q) => p.d - q.d);
    const HZ = [];
    (D.alerts || []).forEach(a => { if (HZ.length < 3 && !HZ.some(x => x.hazard === a.hazard)) HZ.push(a); });
    const W = [1, 0.6, 0.4];
    // ground height of the nearest candidates, only when flood / tsunami / cyclone make "higher ground" matter
    if (opt.elev && D.elev != null && HZ.some(a => ["flood", "tsunami", "cyclone"].includes(a.hazard))) {
      try {
        const near = cands.filter(c => c.gain == null).slice(0, 15);
        if (near.length) { const e = await SRC.elevs(near); near.forEach((c, i) => { if (e[i] != null) c.gain = Math.round(e[i] - D.elev); }); }
      } catch (e) { /* ranking still works without elevation */ }
    }
    cands.forEach(c => {
      c.mins = c.d * MAP.DETOUR / MAP.WALK_KMH * 60; c.routed = false;
      let v = 0, best = null;
      HZ.forEach((a, i) => { const [dv, why] = MAP.adjust(a, c, pos); v += dv * W[i]; if (why && (!best || why[0] < best[0])) best = why; });
      if (!HZ.length && ["library", "townhall"].includes(c.kind)) v += 8;
      c.adj = v; c.why = best ? best[1] : "why_near"; c.s = c.mins + c.adj;
    });
    cands.sort((p, q) => p.s - q.s);
    let top = cands.slice(0, 6);
    if (opt.route) { // real walking distance from OpenStreetMap routing for the best few candidates
      const r = await Promise.all(top.map(c => c.kind === "higher" ? Promise.resolve(null) : SRC.route(pos, c).catch(() => null)));
      r.forEach((x, i) => { if (x) { const c = top[i]; c.mins = x.km / MAP.WALK_KMH * 60; c.routed = true; c.geom = x.geom; c.s = c.mins + c.adj; } });
    }
    top.sort((p, q) => p.s - q.s); top = top.slice(0, 5);
    return top.map((c, i) => ({ name: c.name, kind: c.kind, lat: c.lat, lon: c.lon, d: c.d, mins: Math.max(1, Math.round(c.mins)), routed: c.routed, why: c.why, gain: c.gain, geom: i === 0 ? c.geom : undefined }));
  },

  /* ---------- Leaflet loading ---------- */
  load() {
    if (window.L) return Promise.resolve();
    if (MAP.ready) return MAP.ready;
    MAP.ready = new Promise((ok, bad) => {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = MAP.CSS; document.head.append(css);
      const s = document.createElement("script"); s.src = MAP.JS; s.onload = ok;
      s.onerror = () => { MAP.ready = null; css.remove(); s.remove(); bad(new Error("Leaflet failed to load")); };
      document.head.append(s);
    });
    return MAP.ready;
  },

  /* ---------- card (one persistent DOM node, re-attached on every render so the map is not rebuilt) ---------- */
  card() {
    if (!MAP.node) {
      MAP.title = h("h3"); MAP.st = h("div", { class: "mu", role: "status" }); MAP.div = h("div", { class: "mapbox", role: "application" });
      MAP.ctl = h("div", { class: "row" }); MAP.note = h("div", { class: "mu" });
      MAP.node = h("section", { class: "card", id: "mapcard" }, MAP.title, MAP.st, MAP.div, MAP.ctl, MAP.note);
    }
    MAP.title.textContent = "🗺️ " + tr("map_title"); MAP.note.textContent = tr("map_note"); MAP.div.setAttribute("aria-label", tr("map_title"));
    MAP.controls();
    return MAP.node;
  },
  liteCard() {
    return h("section", { class: "card" }, h("h3", null, "🗺️ " + tr("map_title")),
      h("button", { onclick: () => { S.mapOn = true; renderOut(); if (typeof extras === "function") extras(); } }, tr("map_load")));
  },
  controls() {
    MAP.ctl.textContent = "";
    const fit = (b, z) => () => { if (b && MAP.map) MAP.map.fitBounds(b, { padding: [30, 30], maxZoom: z }); };
    MAP.ctl.append(
      h("button", { disabled: MAP.hazB ? null : "", onclick: () => fit(MAP.hazB, 12)() }, "⚠️ " + tr("map_hazards")),
      h("button", { disabled: MAP.plcB ? null : "", onclick: () => fit(MAP.plcB, 15)() }, "🏃 " + tr("map_places")),
      h("button", { onclick: () => MAP.toggleRadar() }, "☔ " + tr(MAP.radar ? "map_radar_off" : "map_radar")));
  },
  schedule() { clearTimeout(MAP.timer); MAP.timer = setTimeout(() => MAP.update(), 150); }, // after the text has painted

  async update() {
    const D = S.data, pos = S.pos, my = ++MAP.tick;
    if (!D || !pos || !MAP.node) return;
    if (!MAP.map) MAP.st.textContent = tr("map_loading");
    try { await MAP.load(); } catch (e) { if (!MAP.map) MAP.st.textContent = tr("map_fail"); return; }
    if (my !== MAP.tick || !MAP.node.isConnected) return; // a newer render supersedes this one
    if (!MAP.map) {
      MAP.map = L.map(MAP.div, { worldCopyJump: true }).setView([pos.lat, pos.lon], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(MAP.map);
      MAP.layer = L.layerGroup().addTo(MAP.map);
      MAP.st.textContent = "";
    }
    MAP.map.invalidateSize();
    MAP.layer.clearLayers();
    MAP.draw(D, pos);
    MAP.controls();
  },

  /* ---------- drawing ---------- */
  draw(D, pos) {
    const me = [pos.lat, pos.lon], now = Date.now(), add = l => l.addTo(MAP.layer), hb = [me], pb = [me];
    const span = t => h("span", null, t);
    const ring = (c, km, col, label, dashed) => { const l = add(L.circle(c, { radius: km * 1000, color: col, weight: 2, fill: false, dashArray: dashed ? "6 8" : null })); l.bindTooltip(span(label), { sticky: true }); };
    let area = false;

    (D.alerts || []).slice(0, 8).forEach(a => {
      const col = MAP.SEV_COL[CAP.sevIdx(a.severity)], title = EMO[a.hazard] + " " + trN("hz", a.hazard) + " · " + trN("sev", a.severity);
      const info = () => h("div", null, h("b", null, title), h("br"), headline(a), h("br"), etaPlain(a));
      if (a.evLat != null) {
        const ev = [a.evLat, a.evLon]; hb.push(ev);
        add(L.circleMarker(ev, { radius: 9, color: "#fff", weight: 2, fillColor: col, fillOpacity: 0.95 })).bindPopup(info());
        if ((a.hazard === "quake" || a.hazard === "tsunami") && a.evAt) { // expanding wave front (S-wave 3.5 km/s, tsunami 700 km/h) + the ring that reaches the user
          const r = a.hazard === "quake" ? Math.max(0, (now - a.evAt) / 1000 * 3.5) : Math.max(0, (now - a.evAt) / 3600e3 * 700);
          if (r > 1) ring(ev, Math.min(r, 3000), col, tr("map_front"));
          if (a.distKm != null) ring(ev, a.distKm, col, etaPlain(a), true);
        } else if (a.hazard === "cyclone" && a.track && a.track.length) {
          const pts = a.track.map(p => [p[0], p[1]]);
          if (pts.length > 1) add(L.polyline(pts, { color: col, weight: 3 })).bindTooltip(span(tr("map_track")));
          pts.forEach(p => add(L.circleMarker(p, { radius: 3, color: col, fillColor: col, fillOpacity: 1 })));
          if (a.track.length >= 2) { // straight-line projection from the last two track points
            const p1 = a.track[a.track.length - 2], p2 = a.track[a.track.length - 1], dt = (p2[2] - p1[2]) / 3600e3;
            if (dt > 0) {
              const sp = SRC.hav(p1[0], p1[1], p2[0], p2[1]) / dt, br = SRC.bearing(p1[0], p1[1], p2[0], p2[1]);
              if (sp > 2) {
                const line = [ev];
                [12, 24, 48].forEach(hr => {
                  const p = SRC.dest(a.evLat, a.evLon, br, Math.min(sp * hr, 2500)); line.push(p); hb.push(p);
                  add(L.circleMarker(p, { radius: 5, color: col, weight: 2, fill: false })).bindTooltip(span("+" + hr + " h · " + tr("map_proj")));
                });
                add(L.polyline(line, { color: col, weight: 2, dashArray: "4 8" }));
              }
            }
          }
        } else if (a.hazard === "fire" && a.wind && a.wind.speed >= 5) { // rough downwind spread, ~3 % of wind speed
          const dw = (a.wind.dir + 180) % 360, kmh = 0.03 * a.wind.speed, line = [ev];
          [6, 12, 24].forEach(hr => {
            const p = SRC.dest(a.evLat, a.evLon, dw, kmh * hr); line.push(p); if (hr <= 12) hb.push(p);
            add(L.circleMarker(p, { radius: 4, color: col, weight: 2, fill: false })).bindTooltip(span("+" + hr + " h · " + tr("map_wind")));
          });
          add(L.polyline(line, { color: col, weight: 2, dashArray: "4 8" }));
        }
      } else { // forecast / official alert for the area around the user: nominal circle, not a real footprint
        area = true;
        add(L.circle(me, { radius: (a.radiusKm || 10) * 1000, color: col, weight: 2, dashArray: "6 8", fillColor: col, fillOpacity: 0.08 }))
          .bindTooltip(span(title + " · " + (a.official && a.areaDesc ? a.areaDesc : tr("map_area"))), { sticky: true });
      }
    });

    // safe places: ranked list if available, otherwise the nearest few
    const ranked = D.ranked && D.ranked.length ? D.ranked : null;
    const list = ranked || (D.shelters || []).slice(0, 5).map(x => Object.assign({}, x, { mins: Math.round(x.d * MAP.DETOUR / MAP.WALK_KMH * 60), routed: false, why: "why_near" }));
    if (ranked && ranked[0].geom) add(L.polyline(ranked[0].geom, { color: "#1e8e5a", weight: 5, opacity: 0.8 }));
    list.forEach((x, i) => {
      const rec = !!ranked && i === 0;
      const m = add(L.marker([x.lat, x.lon], { keyboard: true, title: placeName(x), icon: L.divIcon({ className: "pin" + (rec ? " rec" : ""), html: rec ? "★" : String(i + 1), iconSize: [28, 28], iconAnchor: [14, 14] }) }));
      m.bindPopup(h("div", null, h("b", null, (rec ? "⭐ " + tr("map_rec") + " · " : "") + placeName(x)), h("br"),
        tr("kind_" + x.kind) + " · ~" + x.mins + " " + tr("walk") + " (" + tr(x.routed ? "route_tag" : "est_tag") + ")", h("br"), tr(x.why), h("br"),
        h("a", { href: mapsLink(pos, x), target: "_blank", rel: "noopener" }, tr("dir") + " ↗")));
      pb.push([x.lat, x.lon]);
    });
    add(L.circleMarker(me, { radius: 8, color: "#fff", weight: 3, fillColor: "#1565c0", fillOpacity: 1 })).bindPopup(h("b", null, tr("map_you")));

    MAP.hazB = hb.length > 1 ? L.latLngBounds(hb) : null; MAP.plcB = pb.length > 1 ? L.latLngBounds(pb) : null;
    const key = [pos.lat.toFixed(3), pos.lon.toFixed(3), list.length, (D.alerts || []).length, D.sim ? 1 : 0].join();
    if (key !== MAP.key) { // re-frame only when something material changed, so panning is not undone by the 5-minute refresh
      MAP.key = key;
      if (MAP.plcB) MAP.map.fitBounds(MAP.plcB, { padding: [30, 30], maxZoom: 15 }); else MAP.map.setView(me, area ? 11 : 13);
    }
  },

  /* ---------- rain radar (RainViewer, best effort) ---------- */
  async toggleRadar() {
    if (!MAP.map) return;
    if (MAP.radar) { clearInterval(MAP.radar.t); MAP.map.removeLayer(MAP.radar.layer); MAP.radar = null; MAP.st.textContent = ""; MAP.controls(); return; }
    try {
      const j = await SRC.j("https://api.rainviewer.com/public/weather-maps.json", 10000);
      const fr = [].concat((j.radar && j.radar.past) || [], (j.radar && j.radar.nowcast) || []);
      if (!fr.length) throw new Error("no radar frames");
      const url = f => j.host + f.path + "/256/{z}/{x}/{y}/2/1_1.png";
      let i = fr.length - 1;
      const layer = L.tileLayer(url(fr[i]), { opacity: 0.65, maxNativeZoom: 7, maxZoom: 18, attribution: "Radar © RainViewer" }).addTo(MAP.map);
      const show = () => { layer.setUrl(url(fr[i])); MAP.st.textContent = "☔ " + hhmm(fr[i].time * 1000) + (fr[i].time * 1000 > Date.now() ? " (+)" : ""); };
      MAP.radar = { layer, t: setInterval(() => { i = (i + 1) % fr.length; show(); }, 900) };
      show();
    } catch (e) { MAP.st.textContent = tr("map_radar_fail"); }
    MAP.controls();
  }
};
