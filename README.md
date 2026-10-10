# 🛟 SafeStay — Real-Time Crisis Communication for Tourists

> **Track:** TravelTech — *Real-Time Crisis Communication for Tourists During Extreme Weather Events*
> **Live demo:** `<paste your GitHub Pages / Netlify link here>`
> **Demo video:** [`demo/demo.mp4`](demo/demo.mp4) · `<optional YouTube unlisted link>`

## 1. The problem

When a flash flood, cyclone, wildfire or earthquake hits, foreign tourists are the most exposed people in the area: they don't know the local geography, can't read local-language warnings, and can't tell which areas are actually unsafe. Official warnings are fragmented and rarely translated, so travellers fall back on unverified social media rumours. The result is panic, tourists walking *into* danger, and avoidable strain on rescue services.

## 2. The solution

**SafeStay** is a free, installable web app (PWA) that turns scattered hazard data into one clear answer for the person holding the phone:

> **What is coming? How bad? How long do I have? What exactly should I do — in my language?**

| Feature | What it does |
|---|---|
| 🌍 **Multi-hazard detection** | Floods / heavy rain, storms & cyclones, earthquakes, tsunami risk, wildfires, extreme heat, volcanoes, landslides. |
| ⏱️ **ETA ("how long do I have")** | Live countdown per hazard: forecast onset for weather, S-wave arrival for earthquakes, wind-driven spread for wildfires, track-based arrival for cyclones, wave travel time for tsunami. |
| 📋 **Concise step-by-step actions** | 4 short, ordered steps per hazard. Heading switches between **"Do this now"** and **"Prepare"** depending on urgency. |
| 🏃 **Escape options** | Nearest shelters & hospitals with walking time + directions, nearest **higher ground** (elevation sampling) for floods/tsunami/storm surge, and "move away from the fire" compass direction. |
| 🌐 **Multilingual** | English, हिन्दी, தமிழ், Español, 中文 — alerts, steps and UI. |
| 📡 **Low-bandwidth mode** | Auto-enabled on 2G / Data Saver / offline. Fetches smaller feeds, skips maps and shelters, renders **plain text** and gives a one-tap **copy-as-text summary** that can be sent by SMS. |
| 📴 **Offline-first** | A service worker caches the app. All safety guides work with **zero connectivity**; the last result is cached and its countdowns keep running. |
| 👪 **Tell your family** | One tap builds *"✅ I'm safe / 🆘 I need help / ℹ️ status"* + a Google Maps location link + the current top hazard. Send via native share, WhatsApp, or **SMS to saved contacts (works without internet)**. |
| 📞 **Local emergency number** | Offline lookup, with `112` (works on GSM networks worldwide) as fallback. |
| 🧾 **CAP-aligned** | All alerts use the OASIS **Common Alerting Protocol 1.2** vocabulary; export any alert as CAP XML; ingest any CAP feed. See §4. |
| 🧪 **Demo scenarios** | Clearly labelled **SIMULATION** scenarios (flood, cyclone, quake, fire, heat) for presentations when nothing is happening in real life. |

## 3. How it works

```
 GPS / city ──► Open-Meteo ─ forecast (rain, gusts, heat, humidity, wind) + elevation
            ├─► USGS ───────  earthquakes (last 24 h)
            ├─► NASA EONET ─  wildfires, cyclones, volcanoes, floods, landslides
            ├─► US NWS ─────  official CAP alerts (US only)
            ├─► Custom CAP ─  any CAP 1.2 feed URL you configure
            └─► Overpass ───  shelters / hospitals / assembly points (OpenStreetMap)
                     │
          analyse + normalise to CAP alert objects  (js/sources.js, js/cap.js)
                     │
     sort by severity then ETA ─► localised UI (js/app.js, js/i18n.js)
                     │
      cache ► offline  ·  low-bandwidth text view  ·  family broadcast
```

Everything runs **in the browser** — no backend, no accounts, no API keys, no tracking. Location and family contacts never leave the device (except the message the user chooses to send).

### Thresholds (see `js/sources.js`)
| Hazard | Trigger (→ CAP severity Minor / Moderate / Severe / Extreme) |
|---|---|
| Flood | rain ≥ 5 / 10 / 20 / 40 mm/h, or 24 h total ≥ 75 / 120 / 200 / 300 mm; +1 level if elevation < 10 m |
| Storm | gusts ≥ 60 / 90 / 120 / 160 km/h; thunderstorm codes raise to Minor/Moderate |
| Heat | apparent temperature ≥ 38 / 41 / 46 / 52 °C |
| Fire weather | hot + dry + windy conditions (clearly labelled *conditions*, not an active fire) |
| Earthquake | magnitude × distance rules (e.g. M7+ within 150 km = Extreme); S-wave ETA = hypocentral distance ÷ 3.5 km/s |
| Tsunami | M ≥ 6.5 shallow offshore quake flagged by USGS, user < 40 m elevation; ETA = distance ÷ 700 km/h |
| Wildfire (active) | EONET fire within 100 km; ETA only if wind is blowing from the fire toward the user (spread ≈ 3 % of wind speed) |
| Cyclone | EONET storm within 800 km (own hazard type since v2); ETA from the storm's last two track points when it is heading toward the user |
| Extreme cold | apparent temperature (incl. wind chill) ≤ −15 / −25 / −35 / −45 °C |
| Dust / sandstorm | Open-Meteo air-quality (CAMS) mineral dust ≥ 200 / 500 / 1000 / 2000 µg/m³ |

## 4. CAP (Common Alerting Protocol) alignment

SafeStay represents every alert — whether derived by us or received from an official source — with the CAP 1.2 fields:

| CAP field | In SafeStay |
|---|---|
| `category` | Met / Geo / Fire / Health / Other (from hazard) |
| `event` | e.g. "Flood / Heavy Rain", "Earthquake" |
| `urgency` | Immediate (≤ 1 h) / Expected (≤ 12 h) / Future / Past / Unknown, from the ETA |
| `severity` | Minor / Moderate / Severe / Extreme / Unknown |
| `certainty` | Observed (e.g. USGS) / Likely / Possible (forecasts) |
| `onset`, `expires` | ETA and end of the hazard window |
| `headline`, `instruction` | localised headline; step-by-step instructions |
| `area` | `areaDesc` + `circle` around the user |
| `status` | `Actual`, or `Exercise` for simulations |

* **Export:** every alert card has **⬇ Download CAP 1.2 XML** (`CAP.xml()` in `js/cap.js`).
* **Ingest:** paste any CAP 1.2 XML feed URL in **Settings** (the server must allow CORS); alerts whose `circle`/`polygon` contains the user are shown. US National Weather Service alerts (native CAP) are fetched automatically in the US.
* **Honest scope:** SafeStay is a CAP-aligned *consumer / aggregator*, not a certified CAP issuer. Alerts it computes itself are labelled **Estimate** and are never presented as official warnings.

## 5. Open-source libraries & APIs used (disclosure)

Plain HTML/CSS/JS. The only third-party script is [Leaflet](https://leafletjs.com/) 1.9.4 (BSD-2), loaded lazily from cdnjs **after** the text result and never in low-bandwidth mode unless the person taps *Load map*. External data APIs (all free, keyless):

* [Open-Meteo](https://open-meteo.com/) — weather forecast & elevation (CC BY 4.0)
* [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/earthquakes/feed/) — earthquake feed (public domain)
* [NASA EONET](https://eonet.gsfc.nasa.gov/) — natural event tracker
* [US National Weather Service API](https://www.weather.gov/documentation/services-web-api) — official CAP alerts (US)
* [OpenStreetMap](https://www.openstreetmap.org/copyright) via the [Overpass API](https://overpass-api.de/) — shelters/hospitals (ODbL)
* [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api) — worldwide city search; [Open-Meteo air quality](https://open-meteo.com/en/docs/air-quality-api) — dust forecast
* [BigDataCloud client reverse-geocoding](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api) — place name for GPS positions (best effort)
* [OpenStreetMap Germany routing](https://routing.openstreetmap.de/) — walking routes (public server, fair use) and OSM map tiles
* [RainViewer](https://www.rainviewer.com/api.html) — optional rain-radar overlay (best effort)
* Directions open in Google Maps (link only, no API)

## 6. Run locally

```bash
git clone <your-repo-url> && cd safestay
python3 -m http.server 8000      # or: npx serve .
# open http://localhost:8000
```
Use a local server (not `file://`) so geolocation and the service worker work. Try `http://localhost:8000/?demo=quake` for an instant simulation (`flood`, `cyclone`, `quake`, `fire`, `heat`).

## 7. Deploy (free)

See the step-by-step guide in the project hand-off notes: GitHub Pages → *Settings → Pages → Deploy from branch → `main` / root*. Any static host works (Netlify, Cloudflare Pages, Vercel). HTTPS is required for GPS and the service worker; all of these provide it.

## 8. Project structure

```
index.html              app shell
css/style.css           responsive, dark-mode aware, low-bandwidth styling
js/i18n.js              5 languages: UI, hazard names, alert templates, step-by-step guides
js/i18n2.js             extra strings: cold / dust / cyclone, city search, map UI
js/map.js               lazy-loaded Leaflet map, safe-place ranking, hazard overlays, rain radar
js/cap.js               CAP 1.2: normalised alert model, XML export, feed parser
js/sources.js           data fetchers + hazard analysis + ETA logic + emergency numbers
js/app.js               UI, low-bandwidth mode, family broadcast, demo scenarios, caching
sw.js                   service worker (offline app shell)
manifest.webmanifest    installable PWA
icon.svg
demo/                   demo video goes here
```

## 8b. Version 2 additions

* **Any city worldwide:** type-ahead search (Open-Meteo geocoding) replaces the 12-city list; GPS positions get a reverse-geocoded name. The 12 built-in cities remain as an offline fallback.
* **More hazards:** extreme cold, dust/sandstorm, and cyclone/hurricane/typhoon as its own type (with 5-language guides). `CAP.guess` maps official alert names to them.
* **Map view:** you, the ranked safe places (★ = recommended, with a walking route), hazard positions, cyclone track + straight-line projection, wildfire downwind spread, earthquake/tsunami wave fronts, nominal forecast areas and an optional rain-radar loop.
* **Ranking:** candidates from OpenStreetMap (shelters, hospitals, assembly points, community centres, town halls, libraries, plus the higher-ground point) are scored by walking time (OSM route when available, otherwise straight-line × 1.3 at 5 km/h) plus a hazard-specific adjustment: higher ground for flood/tsunami/cyclone, open assembly points for earthquakes, indoor buildings for heat/cold/dust/storm, away from the hazard for fire/volcano/landslide. Weights live in `MAP.adjust()` in `js/map.js`; they are heuristics, not official guidance.
* **Text first:** the map is built after the text result has rendered; if it cannot load, the text guidance is unaffected.

## 9. Limitations (we'd rather be upfront)

* **Estimates, not warnings.** ETAs are modelled from public data; always follow local authorities. USGS data lags real events by minutes, so quake "countdowns" are mainly useful for distant events and tsunami arrival; for local shaking use national early-warning systems.
* **EONET coverage is partial** (large, curated events). Planned: NASA FIRMS active-fire pixels.
* **Family broadcast needs a tap** (web apps can't send SMS silently). SMS/WhatsApp links are pre-filled.
* **Translations** are prototype quality — have native speakers review before real deployment.
* Shelter data depends on OpenStreetMap completeness; it may be empty in some regions. "Cooling/warming centres" have no standard OSM tag, so indoor public buildings are used as a proxy.
* Hazard progression on the map is a straight-line extrapolation from recent track points or wind speed, not an official forecast cone. Weather-type alerts are drawn as a nominal circle around the point forecast, not a real footprint.
* Dust forecasts come from a coarse global model and can miss local sandstorms. GDACS (official multi-hazard feed) is still on the roadmap.
* The public routing, tile and radar servers are fair-use; for production traffic use a paid or self-hosted provider.

## 10. Roadmap

Official alert feeds per country (India NDMA *Sachet*, MeteoAlarm, JMA) via a small CORS proxy · push notifications · live location sharing with a lightweight backend · crowd-sourced "road flooded" reports · GDACS and NASA FIRMS integration · more languages · accessibility (voice read-out).

## 11. Team

`<names, college>` — IIITDM Kancheepuram · Built during the hackathon. Licence: MIT.
