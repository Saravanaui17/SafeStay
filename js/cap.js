"use strict";
/* Common Alerting Protocol (OASIS CAP 1.2) alignment.
   Every alert in SafeStay – whatever its source – is normalised into one object that uses the CAP vocabulary:
   category, event, urgency, severity, certainty, onset, expires, headline, instruction, area.
   Alerts can be exported as valid-shaped CAP 1.2 XML, and any CAP feed can be ingested (see CAP.parse).
   SafeStay is a CAP-aligned *consumer*, not a certified CAP issuer: derived alerts are marked status "Actual"/"Exercise"
   with the sender "safestay.app" and are flagged as estimates. */
const CAP = {
  SEV: ["Unknown", "Minor", "Moderate", "Severe", "Extreme"],
  CAT: { flood: "Met", storm: "Met", heat: "Health", fire: "Fire", quake: "Geo", tsunami: "Geo", volcano: "Geo", landslide: "Geo", general: "Other" },
  EVENT: { flood: "Flood / Heavy Rain", storm: "Severe Wind / Storm", heat: "Extreme Heat", fire: "Wildfire", quake: "Earthquake", tsunami: "Tsunami", volcano: "Volcanic Activity", landslide: "Landslide", general: "Hazard" },
  sevIdx(s) { return Math.max(0, CAP.SEV.indexOf(s)); },
  esc(s) { return String(s == null ? "" : s).replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])); },
  iso(t) { return new Date(t).toISOString().replace(/\.\d{3}Z$/, "+00:00"); }, // CAP wants an explicit offset
  urgency(etaMs) { if (etaMs == null) return "Unknown"; if (etaMs <= 3600e3) return "Immediate"; if (etaMs <= 12 * 3600e3) return "Expected"; return "Future"; },
  guess(t) {
    t = (t || "").toLowerCase();
    return /tsunami/.test(t) ? "tsunami" : /earthquake|seismic/.test(t) ? "quake" : /volcan/.test(t) ? "volcano" :
      /landslide|mudslide|debris/.test(t) ? "landslide" : /fire|red flag/.test(t) ? "fire" : /heat/.test(t) ? "heat" :
      /flood|rain|flash/.test(t) ? "flood" : /storm|wind|hurricane|typhoon|cyclone|tornado|gale|thunder/.test(t) ? "storm" : "general";
  },
  /** Build a normalised alert. `o` must contain at least {hazard, severity}. */
  make(o) {
    const now = Date.now();
    const a = Object.assign({
      sender: "safestay.app", status: o.sim ? "Exercise" : "Actual", msgType: "Alert", scope: "Public",
      certainty: "Possible", severity: "Moderate", urgency: "Unknown",
      sentAt: now, etaAt: null, peakAt: null, expiresAt: null, occurredAt: null, active: false,
      estimated: false, official: false, source: "SafeStay", params: {}, tpl: null, headline: "", instruction: "",
      areaDesc: "", bearing: null, distKm: null, radiusKm: 10, lat: null, lon: null
    }, o);
    a.category = a.category || CAP.CAT[a.hazard] || "Other";
    a.event = a.event || CAP.EVENT[a.hazard] || "Hazard";
    a.id = a.id || "safestay-" + a.hazard + "-" + Math.round(now / 1000) + "-" + Math.floor(Math.random() * 1e4);
    if (a.urgency === "Unknown" && a.etaAt) a.urgency = CAP.urgency(a.etaAt - now);
    return a;
  },
  /** Serialise one alert to CAP 1.2 XML (English). */
  xml(a) {
    const e = CAP.esc, H = a.headline || fmt(I18N.en[a.tpl], a.params);
    const steps = a.instruction || (I18N.en.G[a.hazard] || I18N.en.G.general).map((s, i) => (i + 1) + ". " + s).join(" ");
    const area = a.lat != null ? "      <circle>" + a.lat.toFixed(4) + "," + a.lon.toFixed(4) + " " + (a.radiusKm || 10) + "</circle>\n" : "";
    return '<?xml version="1.0" encoding="UTF-8"?>\n<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">\n' +
      "  <identifier>" + e(a.id) + "</identifier>\n  <sender>" + e(a.sender) + "</sender>\n  <sent>" + CAP.iso(a.sentAt) + "</sent>\n" +
      "  <status>" + a.status + "</status>\n  <msgType>" + a.msgType + "</msgType>\n  <scope>" + a.scope + "</scope>\n  <info>\n" +
      "    <language>en</language>\n    <category>" + a.category + "</category>\n    <event>" + e(a.event) + "</event>\n" +
      "    <urgency>" + a.urgency + "</urgency>\n    <severity>" + a.severity + "</severity>\n    <certainty>" + a.certainty + "</certainty>\n" +
      (a.etaAt ? "    <onset>" + CAP.iso(a.etaAt) + "</onset>\n" : "") +
      (a.expiresAt ? "    <expires>" + CAP.iso(a.expiresAt) + "</expires>\n" : "") +
      "    <senderName>" + e(a.source) + "</senderName>\n    <headline>" + e(H) + "</headline>\n" +
      "    <description>" + e(H + (a.estimated ? " (estimated by SafeStay, not an official warning)" : "")) + "</description>\n" +
      "    <instruction>" + e(steps) + "</instruction>\n    <area>\n      <areaDesc>" + e(a.areaDesc || "Around the user's location") + "</areaDesc>\n" + area + "    </area>\n  </info>\n</alert>\n";
  },
  inPoly(lat, lon, str) {
    const p = str.trim().split(/\s+/).map(s => s.split(",").map(Number)); let in_ = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [yi, xi] = p[i], [yj, xj] = p[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) in_ = !in_;
    }
    return in_;
  },
  /** Parse a CAP 1.2 XML document (one or more <alert> elements) and keep alerts whose area contains the user. */
  parse(txt, lat, lon) {
    const d = new DOMParser().parseFromString(txt, "application/xml");
    if (d.getElementsByTagName("parsererror").length) throw new Error("Invalid CAP XML");
    const g = (n, t) => { const x = n.getElementsByTagName(t)[0]; return x ? x.textContent.trim() : ""; };
    const out = [], now = Date.now();
    for (const al of d.getElementsByTagName("alert")) {
      if (g(al, "status") === "Test" || g(al, "msgType") === "Cancel") continue;
      const infos = [...al.getElementsByTagName("info")];
      const info = infos.find(i => g(i, "language").toLowerCase().startsWith("en")) || infos[0];
      if (!info) continue;
      const exp = Date.parse(g(info, "expires")); if (exp && exp < now) continue;
      const areas = [...info.getElementsByTagName("area")]; let geo = false, inside = false;
      for (const ar of areas) {
        for (const c of ar.getElementsByTagName("circle")) {
          const m = c.textContent.trim().match(/^(-?[\d.]+),(-?[\d.]+)\s+([\d.]+)/);
          if (m) { geo = true; if (SRC.hav(lat, lon, +m[1], +m[2]) <= +m[3]) inside = true; }
        }
        for (const p of ar.getElementsByTagName("polygon")) { geo = true; if (CAP.inPoly(lat, lon, p.textContent)) inside = true; }
      }
      if (geo && !inside) continue;
      const onset = Date.parse(g(info, "onset") || g(info, "effective"));
      const ev = g(info, "event");
      out.push(CAP.make({
        id: g(al, "identifier"), sender: g(al, "sender"), source: g(info, "senderName") || g(al, "sender"), official: true,
        hazard: CAP.guess(ev + " " + g(info, "headline")), event: ev, category: g(info, "category") || "Other",
        severity: g(info, "severity") || "Unknown", urgency: g(info, "urgency") || "Unknown", certainty: g(info, "certainty") || "Unknown",
        etaAt: onset && onset > now ? onset : null, active: !onset || onset <= now, expiresAt: exp || null,
        headline: g(info, "headline") || ev, instruction: g(info, "instruction"), areaDesc: g(info, "areaDesc")
      }));
    }
    return out;
  }
};
