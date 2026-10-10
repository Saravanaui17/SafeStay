# SafeStay

A disaster alert web app for tourists. It checks what natural hazards are near you, estimates how long until they reach you, and tells you what to do in your own language, even on a weak connection.

Built for the TravelTech track: *Real-Time Crisis Communication for Tourists During Extreme Weather Events*.

- Live app: hosted on GitHub Pages (link in the repository's About section)
- Demo video: [demo/demo.mp4](demo/demo.mp4)

## Problem

When a flash flood, cyclone, wildfire or earthquake hits, foreign tourists are among the people most at risk. They don't know the local geography, often can't read local-language warnings, and have no easy way to tell which areas are actually unsafe. Official warnings are scattered across agencies and are rarely translated, so many travellers end up relying on unverified social media posts. That leads to panic, people walking into danger zones, and extra pressure on rescue services.

## What SafeStay does

SafeStay answers four questions for the person holding the phone: what is coming, how bad is it, how long do I have, and what should I do right now.

- **Multiple hazards.** Floods and heavy rain, storms and cyclones, earthquakes, tsunami risk, wildfires, extreme heat, volcanoes and landslides.
- **Time estimate.** Each hazard gets a live countdown. How it is calculated depends on the hazard (see "How the estimates work").
- **Clear instructions.** Four short, ordered steps per hazard. The heading changes between "Do this now" and "Prepare" based on how soon the hazard arrives.
- **Escape options.** Nearest shelters and hospitals with walking times and directions, the nearest higher ground for flood-type hazards, and a "move away from the fire" direction for wildfires.
- **Languages.** English, Hindi, Tamil, Spanish and Chinese. The interface, alerts and instructions are all translated.
- **Low-bandwidth mode.** Turns on automatically on 2G, Data Saver or when offline. It downloads smaller data feeds, skips shelter lookups, and shows plain text with a button to copy a short summary that can be sent by SMS.
- **Offline use.** A service worker caches the app. The safety guides work with no connection at all, and the last result stays on screen with its countdowns still running.
- **Family check-in.** One tap builds an "I'm safe", "I need help" or status message with a map link and the current top hazard. It can be sent through the phone's share sheet, WhatsApp, or as an SMS to saved contacts. SMS works without internet.
- **Emergency number.** Looked up offline from the user's coordinates, with 112 as the fallback since it works on GSM networks worldwide.
- **CAP support.** Alerts follow the Common Alerting Protocol 1.2 structure, can be exported as CAP XML, and external CAP feeds can be added.
- **Demo scenarios.** Simulated flood, cyclone, earthquake, wildfire and heatwave scenarios, clearly marked as simulations, for presentations when nothing is happening in real life.

## Tech stack

- HTML5, CSS3 and vanilla JavaScript. No frameworks, no build step, no third-party JavaScript libraries.
- Progressive Web App: service worker for offline caching and a web app manifest so it can be installed on a phone.
- Browser APIs: Geolocation, Web Share, Clipboard, Cache Storage, localStorage, DOMParser (for reading CAP XML).
- No backend, database or accounts. Everything runs in the browser.
- Hosting: GitHub Pages (static files over HTTPS, which geolocation and service workers require).

## Data sources

All of these are free and need no API key.

| Source | Used for |
|---|---|
| [Open-Meteo](https://open-meteo.com/) | Weather forecast (rain, wind, temperature, humidity) and ground elevation |
| [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/earthquakes/feed/) | Earthquakes from the last 24 hours |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Active wildfires, cyclones, volcanoes, floods and landslides |
| [US National Weather Service API](https://www.weather.gov/documentation/services-web-api) | Official CAP alerts (United States only) |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) via [Overpass](https://overpass-api.de/) | Shelters, hospitals and assembly points |

Directions open in Google Maps through a plain link. No Google API is used.

## How it works

1. The app gets the user's position from GPS, or from a chosen city if GPS is unavailable.
2. It requests the sources above in parallel. If one fails, the others still work and the status line says which source was unavailable.
3. Each source's data is analysed and converted into a common alert object that uses CAP fields (category, event, urgency, severity, certainty, onset, expires, area).
4. Alerts are sorted by severity, then by arrival time, and shown in the selected language.
5. The result is cached locally so it can be shown again when the connection drops.

The pipeline code is in `js/sources.js` and the CAP model is in `js/cap.js`.

## How the estimates work

| Hazard | Severity based on | Arrival time based on |
|---|---|---|
| Flood / heavy rain | Hourly rain (5 / 10 / 20 / 40 mm/h) or 24-hour total (75 / 120 / 200 / 300 mm); raised one level below 10 m elevation | First hour of the forecast that crosses the threshold |
| Storm | Wind gusts (60 / 90 / 120 / 160 km/h) and thunderstorm codes | First forecast hour above threshold |
| Extreme heat | Apparent temperature (38 / 41 / 46 / 52 C) | First forecast hour above threshold |
| Fire weather | Hot, dry and windy conditions together (labelled as conditions, not an active fire) | First forecast hour meeting the conditions |
| Earthquake | Magnitude and distance | Distance divided by S-wave speed (3.5 km/s) |
| Tsunami | Large shallow offshore quake flagged by USGS, user below 40 m elevation | Distance divided by open-ocean wave speed (about 700 km/h) |
| Active wildfire | Distance to the fire (within 100 km) | Only shown if the wind blows from the fire toward the user; spread assumed at about 3% of wind speed |
| Cyclone | Distance (within 800 km) and wind speed | Storm's recent track, only if it is heading toward the user |

The four CAP severity levels (Minor, Moderate, Severe, Extreme) are used throughout. These are estimates built from public data, not official warnings.

## CAP alignment

SafeStay stores and displays every alert with CAP 1.2 fields, whether the alert was computed by the app or received from an official feed.

- **Export.** Every alert has a "Download CAP 1.2 XML" button (see `CAP.xml()` in `js/cap.js`). Simulated alerts are exported with status `Exercise`.
- **Import.** A CAP 1.2 XML feed URL can be added under Settings. Alerts whose circle or polygon contains the user are shown. The feed server must allow cross-origin requests.
- **US alerts.** National Weather Service alerts are native CAP and are fetched automatically for US locations.

SafeStay is a CAP-aligned consumer of alerts, not a certified CAP issuer. Anything it computes itself is labelled as an estimate.

## Project structure

```
index.html              app shell
css/style.css           layout, dark mode, low-bandwidth styling
js/i18n.js              translations, hazard names, alert text, instruction steps
js/cap.js               CAP model, XML export, feed parser
js/sources.js           data fetching, hazard analysis, arrival time logic
js/app.js               interface, low-bandwidth mode, family check-in, demo scenarios, caching
sw.js                   service worker for offline use
manifest.webmanifest    PWA manifest
icon.svg                app icon
demo/                   demo video
```

## Running locally

Clone or download the repository, then from its root folder run:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 in a browser. A local server is needed (opening the file directly will not work) because geolocation and the service worker require http or https.

To try a simulation straight away, open `http://localhost:8000/?demo=quake`. The other scenarios are `flood`, `cyclone`, `fire` and `heat`.

## Deployment

The app is a set of static files. To host it on GitHub Pages: push to the `main` branch, open Settings, then Pages, choose "Deploy from a branch", and select `main` and `/ (root)`. Netlify, Cloudflare Pages and Vercel also work with no configuration.

## Known limitations

- Arrival times are estimates. USGS data arrives a few minutes after an event, so the earthquake countdown is most useful for distant quakes and tsunami arrival, not for shaking right under your feet. National early-warning systems are the right tool for that.
- NASA EONET only lists larger, curated events, so smaller wildfires will not appear.
- The family check-in needs a tap to send. A web page cannot send an SMS in the background.
- Shelter results depend on how complete OpenStreetMap is in that area and may be empty in some regions.
- The translations have not been reviewed by native speakers.
- Official local alert feeds are only integrated for the US. Other countries are supported through the custom CAP feed setting.

## Future work

- Native alert feeds for more countries (India's NDMA Sachet, MeteoAlarm in Europe, Japan's JMA)
- Push notifications
- Live location sharing with a small backend
- Crowd-sourced road and flood reports
- NASA FIRMS active-fire data and GDACS events
- More languages and voice read-out for accessibility

## Author

Saravana Kadir

Mahalis Rayhan
