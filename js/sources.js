"use strict";
/* Data sources + hazard analysis. All APIs are free, keyless and CORS-enabled:
   Open-Meteo (forecast + elevation), USGS (earthquakes), NASA EONET (wildfires/storms/volcanoes/floods/landslides),
   US NWS (official CAP alerts, US only), OpenStreetMap Overpass (shelters/hospitals). */
const SRC = {
  timeout: 12000, R: 6371,
  async j(url, ms) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms || SRC.timeout);
    try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); } finally { clearTimeout(t); }
  },
  async txt(url, ms) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms || SRC.timeout);
    try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.text(); } finally { clearTimeout(t); }
  },

  /* ---------- geometry ---------- */
  rad: d => d * Math.PI / 180,
  hav(a, b, c, d) { const x = SRC.rad(c - a), y = SRC.rad(d - b), m = Math.sin(x / 2) ** 2 + Math.cos(SRC.rad(a)) * Math.cos(SRC.rad(c)) * Math.sin(y / 2) ** 2; return 2 * SRC.R * Math.asin(Math.sqrt(m)); },
  bearing(a, b, c, d) { const y = Math.sin(SRC.rad(d - b)) * Math.cos(SRC.rad(c)), x = Math.cos(SRC.rad(a)) * Math.sin(SRC.rad(c)) - Math.sin(SRC.rad(a)) * Math.cos(SRC.rad(c)) * Math.cos(SRC.rad(d - b)); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; },
  dest(a, b, brg, km) { const d = km / SRC.R, t = SRC.rad(brg), p1 = SRC.rad(a), l1 = SRC.rad(b), p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t)), l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2)); return [p2 * 180 / Math.PI, ((l2 * 180 / Math.PI + 540) % 360) - 180]; },
  angDiff(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; },
  compass(b) { return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(b / 45) % 8]; },
  ago(ms) { const m = Math.max(1, Math.round(ms / 60000)); return m < 90 ? m + " min" : Math.round(m / 60) + " h"; },

  /* ---------- fetchers ---------- */
  weather(lat, lon, low) {
    return SRC.j("https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(4) + "&longitude=" + lon.toFixed(4) +
      "&hourly=precipitation,wind_gusts_10m,apparent_temperature,relative_humidity_2m,temperature_2m,wind_speed_10m,wind_direction_10m,weather_code" +
      "&current=temperature_2m&forecast_days=" + (low ? 2 : 3) + "&timezone=auto");
  },
  usgs(low) { return SRC.j("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/" + (low ? "4.5" : "2.5") + "_day.geojson"); },
  eonet(lat, lon, low) {
    const r = low ? 3 : 6, b = [lon - r, lat + r, lon + r, lat - r].map(x => x.toFixed(2)).join(",");
    return SRC.j("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=" + (low ? 3 : 7) + "&limit=60&category=wildfires,severeStorms,volcanoes,floods,landslides&bbox=" + b);
  },
  async nws(lat, lon) { // official CAP alerts, United States only
    if (lat < 17 || lat > 72 || lon > -64 || lon < -180) return null;
    return SRC.j("https://api.weather.gov/alerts/active?point=" + lat.toFixed(4) + "," + lon.toFixed(4));
  },
  async customCap() { const u = localStorage.getItem("ss_cap"); return u ? SRC.txt(u) : null; },
  async shelters(lat, lon) {
    const a = "(around:5000," + lat.toFixed(5) + "," + lon.toFixed(5) + ")";
    const q = "[out:json][timeout:15];(nwr" + a + '["amenity"~"^(shelter|hospital)$"];nwr' + a + '["emergency"="assembly_point"];);out center 40;';
    const o = await SRC.j("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(q), 18000);
    return o.elements.map(e => {
      const la = e.lat ?? (e.center && e.center.lat), lo = e.lon ?? (e.center && e.center.lon), t = e.tags || {};
      return { name: t.name || t["name:en"] || t.amenity || "Assembly point", kind: t.amenity || t.emergency, lat: la, lon: lo, d: SRC.hav(lat, lon, la, lo) };
    }).filter(x => x.lat != null).sort((p, q) => p.d - q.d).slice(0, 5);
  },
  async higher(lat, lon, elev) { // sample ground 1.5 km and 3 km away in 8 directions, suggest the highest
    const pts = []; for (let b = 0; b < 360; b += 45) for (const r of [1.5, 3]) pts.push([b, r, ...SRC.dest(lat, lon, b, r)]);
    const j = await SRC.j("https://api.open-meteo.com/v1/elevation?latitude=" + pts.map(p => p[2].toFixed(4)).join(",") + "&longitude=" + pts.map(p => p[3].toFixed(4)).join(","));
    let best = 0; j.elevation.forEach((e, i) => { if (e > j.elevation[best]) best = i; });
    const gain = j.elevation[best] - elev, p = pts[best];
    return gain >= 5 ? { brg: p[0], d: p[1], gain: Math.round(gain), lat: p[2], lon: p[3] } : null;
  },

  /* ---------- analysis: Open-Meteo -> flood / storm / heat / fire-weather ---------- */
  fromWeather(w, lat, lon) {
    const H = w.hourly, off = (w.utc_offset_seconds || 0) * 1000, now = Date.now();
    const T = H.time.map(s => Date.parse(s + ":00Z") - off);
    let i0 = T.findIndex(t => t + 3600e3 > now); if (i0 < 0) i0 = 0;
    const N = Math.min(48, T.length - i0), S = k => H[k].slice(i0, i0 + N).map(v => v == null ? 0 : v);
    const rain = S("precipitation"), gust = S("wind_gusts_10m"), app = S("apparent_temperature"), rh = S("relative_humidity_2m"),
      tmp = S("temperature_2m"), ws = S("wind_speed_10m"), wc = S("weather_code"), elev = w.elevation;
    const lvl = (v, th) => th.filter(t => v >= t).length; // 0..4
    const roll = rain.map((_, i) => rain.slice(Math.max(0, i - 23), i + 1).reduce((a, b) => a + b, 0));
    const lows = elev != null && elev < 10;
    const L = {
      flood: rain.map((v, i) => { let l = Math.max(lvl(v, [5, 10, 20, 40]), lvl(roll[i], [75, 120, 200, 300])); if (l > 0 && lows) l = Math.min(4, l + 1); return l; }),
      storm: gust.map((v, i) => Math.max(lvl(v, [60, 90, 120, 160]), wc[i] >= 96 ? 2 : wc[i] >= 95 ? 1 : 0)),
      heat: app.map(v => lvl(v, [38, 41, 46, 52])),
      fire: tmp.map((t, i) => (t >= 38 && rh[i] <= 15 && ws[i] >= 40) ? 3 : (t >= 35 && rh[i] <= 20 && ws[i] >= 30) ? 2 : (t >= 30 && rh[i] <= 30 && ws[i] >= 20) ? 1 : 0)
    };
    const P = {
      flood: () => ({ tpl: "t_flood", params: { p: Math.round(Math.max(...rain)), s: Math.round(Math.max(...roll)) } }),
      storm: () => ({ tpl: "t_storm", params: { g: Math.round(Math.max(...gust)) } }),
      heat: () => ({ tpl: "t_heat", params: { a: Math.round(Math.max(...app)) } }),
      fire: () => { const i = L.fire.indexOf(Math.max(...L.fire)); return { tpl: "t_firewx", params: { h: Math.round(rh[i]), w: Math.round(ws[i]) } }; }
    };
    const alerts = [];
    for (const hz of Object.keys(L)) {
      const lv = L[hz], best = Math.max(...lv); if (best < 1) continue;
      const on = lv.findIndex(x => x >= 1), pk = lv.indexOf(best), last = lv.map(x => x >= 1).lastIndexOf(true);
      const etaMs = Math.max(0, T[i0 + on] - now), p = P[hz]();
      alerts.push(CAP.make({
        hazard: hz, tpl: p.tpl, params: p.params, severity: CAP.SEV[best], urgency: CAP.urgency(etaMs),
        certainty: best >= 2 && on < 24 ? "Likely" : "Possible", etaAt: now + etaMs, active: etaMs === 0,
        peakAt: pk > on ? T[i0 + pk] : null, expiresAt: T[i0 + last] + 3600e3, estimated: false,
        source: "Open-Meteo forecast", areaDesc: "Your location", radiusKm: 10, lat, lon
      }));
    }
    return { alerts, elev, wind: { speed: ws[0], dir: H.wind_direction_10m[i0] } };
  },

  /* ---------- analysis: USGS earthquakes (+ tsunami possibility) ---------- */
  fromUSGS(g, lat, lon, elev) {
    const out = [], now = Date.now();
    for (const f of g.features || []) {
      const p = f.properties, [lo, la, dep] = f.geometry.coordinates, m = p.mag;
      if (m == null || m < 4) continue;
      const d = SRC.hav(lat, lon, la, lo), age = now - p.time;
      if (age > 24 * 3600e3 || d > (m >= 7 ? 1500 : m >= 6 ? 800 : m >= 5 ? 300 : 100)) continue;
      let lv = 1;
      if ((m >= 7 && d < 150) || (m >= 6 && d < 30)) lv = 4;
      else if ((m >= 6 && d < 100) || (m >= 7 && d < 400) || (m >= 5 && d < 20)) lv = 3;
      else if ((m >= 5 && d < 100) || (m >= 6 && d < 300) || (m >= 4.5 && d < 30)) lv = 2;
      if (lv < 3 && age > 6 * 3600e3) continue;
      const hyp = Math.hypot(d, Math.max(0, dep || 0)), arrive = p.time + hyp / 3.5 * 1000, left = arrive - now; // S-wave ~3.5 km/s
      const base = { lat, lon, estimated: true, source: "USGS", areaDesc: "Your location", radiusKm: Math.round(d) + 10, bearing: SRC.bearing(lat, lon, la, lo), distKm: d };
      out.push(CAP.make(Object.assign({
        hazard: "quake", tpl: "t_quake", params: { m: m.toFixed(1), d: Math.round(d), pl: p.place || "" }, severity: CAP.SEV[lv],
        certainty: "Observed", urgency: left > 0 ? CAP.urgency(left) : (age < 3600e3 ? "Immediate" : "Past"),
        etaAt: left > 0 ? arrive : null, occurredAt: left > 0 ? null : p.time
      }, base)));
      if (m >= 6.5 && p.tsunami === 1 && d < 1500 && (dep || 0) < 100 && (elev == null || elev < 40)) {
        const t = p.time + d / 700 * 3600e3, tl = t - now; // open-ocean tsunami speed ~700 km/h
        if (tl > -3 * 3600e3) out.push(CAP.make(Object.assign({
          hazard: "tsunami", tpl: "t_tsu", params: { m: m.toFixed(1), d: Math.round(d) }, severity: "Severe", certainty: "Possible",
          urgency: tl > 0 ? CAP.urgency(tl) : "Immediate", etaAt: tl > 0 ? t : null, active: tl <= 0
        }, base)));
      }
    }
    return out;
  },

  /* ---------- analysis: NASA EONET (wildfires, cyclones, volcanoes, floods, landslides) ---------- */
  fromEONET(j, lat, lon, wind) {
    const out = [], now = Date.now();
    const pt = g => { const c = g.coordinates; if (g.type === "Polygon") { const r = c[0]; return [r.reduce((a, x) => a + x[1], 0) / r.length, r.reduce((a, x) => a + x[0], 0) / r.length]; } return [c[1], c[0]]; };
    for (const e of j.events || []) {
      const gs = e.geometry || []; if (!gs.length) continue;
      const cat = (e.categories && e.categories[0] && e.categories[0].id) || "", last = gs[gs.length - 1], [la, lo] = pt(last);
      const d = SRC.hav(lat, lon, la, lo), toEv = SRC.bearing(lat, lon, la, lo), evToUser = SRC.bearing(la, lo, lat, lon), c = SRC.compass(toEv);
      const base = { lat, lon, estimated: true, source: "NASA EONET", areaDesc: "Your location", bearing: toEv, distKm: d, params: { n: e.title, d: Math.round(d), c }, radiusKm: Math.round(d) + 10 };
      let hz, tpl, lv, etaMs = null;
      if (cat === "wildfires") {
        if (d > 100) continue; hz = "fire"; tpl = "t_fire_ev"; lv = d < 5 ? 4 : d < 15 ? 3 : d < 40 ? 2 : 1;
        if (wind && wind.speed >= 5 && SRC.angDiff((wind.dir + 180) % 360, evToUser) <= 50) { // wind blowing from the fire towards the user
          etaMs = Math.max(0, (d - 2) / Math.max(0.3, 0.03 * wind.speed) * 3600e3); if (etaMs > 72 * 3600e3) etaMs = null; // crude: spread ≈ 3% of wind speed
        }
      } else if (cat === "severeStorms") {
        if (d > 800) continue; hz = "storm"; tpl = "t_storm_ev"; const mag = last.magnitudeValue || 0;
        lv = d <= 300 ? (mag >= 96 ? 4 : mag >= 64 ? 3 : 2) : d <= 600 ? (mag >= 64 ? 2 : 1) : 1;
        if (gs.length >= 2) {
          const prev = gs[gs.length - 2], [pa, po] = pt(prev), dt = (Date.parse(last.date) - Date.parse(prev.date)) / 3600e3;
          if (dt > 0) { const sp = SRC.hav(pa, po, la, lo) / dt, hd = SRC.bearing(pa, po, la, lo); if (sp > 2 && SRC.angDiff(hd, evToUser) <= 45) { etaMs = d / sp * 3600e3; if (etaMs > 120 * 3600e3) etaMs = null; } }
        }
        if (etaMs == null && d > 300) continue;
      } else if (cat === "volcanoes") { if (d > 150) continue; hz = "volcano"; tpl = "t_volc"; lv = d <= 30 ? 3 : d <= 100 ? 2 : 1; }
      else if (cat === "floods") { if (d > 150) continue; hz = "flood"; tpl = "t_flood_ev"; lv = d <= 30 ? 3 : d <= 100 ? 2 : 1; }
      else if (cat === "landslides") { if (d > 100) continue; hz = "landslide"; tpl = "t_slide"; lv = d <= 20 ? 3 : 2; }
      else continue;
      out.push(CAP.make(Object.assign({
        hazard: hz, tpl, severity: CAP.SEV[lv], certainty: "Observed", etaAt: etaMs != null ? now + etaMs : null,
        urgency: etaMs != null ? CAP.urgency(etaMs) : (lv >= 3 ? "Expected" : "Unknown"), active: etaMs == null
      }, base)));
    }
    return out;
  },

  /* ---------- analysis: US National Weather Service (already CAP) ---------- */
  fromNWS(j, lat, lon) {
    const now = Date.now();
    return (j.features || []).map(f => {
      const p = f.properties, onset = Date.parse(p.onset || p.effective);
      return CAP.make({
        id: p.id, sender: p.senderName || "NWS", source: "US National Weather Service", official: true, hazard: CAP.guess(p.event + " " + p.headline),
        event: p.event, category: p.category || "Met", severity: p.severity || "Unknown", urgency: p.urgency || "Unknown", certainty: p.certainty || "Unknown",
        etaAt: onset && onset > now ? onset : null, active: !onset || onset <= now, expiresAt: Date.parse(p.expires) || null,
        headline: p.headline || p.event, instruction: p.instruction || "", areaDesc: p.areaDesc || "", lat, lon
      });
    });
  },

  /* ---------- emergency number (offline lookup; 112 works on most GSM networks worldwide) ---------- */
  emergency(lat, lon) {
    const B = [[8, 35, 68, 97, "112"], [24, 50, -125, -66, "911"], [49.8, 60.9, -8.6, 1.8, "999 / 112"], [-44, -10, 113, 154, "000"], [30, 46, 129, 146, "119 / 110"],
      [5.5, 20.5, 97.3, 105.7, "191 / 1669"], [4.5, 21, 116, 127, "911"], [18, 54, 73, 135, "120 / 110"]];
    const m = B.find(b => lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3]);
    return m ? m[4] : "112";
  }
};
