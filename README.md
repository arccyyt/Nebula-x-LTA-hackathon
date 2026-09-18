# Commute Companion SG

A mobile-first web app that gives Singapore commuters **proactive decision
support** -- not "NSL delays", but "take the free bus bridge, +18 min,
here's exactly how". Built for the Smart Commuter Companion challenge (PS2).

**Primary persona: Mdm Lim** (Bedok -> Singapore General Hospital, wheelchair,
lift-dependent, large text). Rachel (fixed-schedule EWL commuter) and Arjun
(flexible-start, crowd-sensitive) are fully wired up as secondary personas --
switch between all three live with the persona chips at the top of the app.

## Quickstart (clean machine)

Requires Node.js 20+.

```bash
npm install          # installs both workspaces (server + web)
npm run dev:server   # terminal 1 -- API on http://localhost:8787
npm run dev:web      # terminal 2 -- app on http://localhost:5173
```

Open `http://localhost:5173` on your phone (same Wi-Fi: `http://<your-LAN-IP>:5173`)
or in a mobile-emulated browser tab. **No API keys are required** -- every
data source has a labelled demo fixture that mirrors the real response shape,
so the app is fully runnable and judgeable offline-from-live-APIs. Every
screen shows a small `demo` / `live` badge per data source so nothing mocked
is ever presented as live.

To switch a source to live data, copy `server/.env.example` to `server/.env`
and fill in the keys you have (see below). Nothing else changes -- the same
adapters call the real endpoint first and only fall back to the fixture on
failure.

## What's implemented against the brief

**3.2.1 Route planning** -- `POST /api/route/plan` (see `server/src/lib/planJourney.ts`)
takes an origin/destination **postal code** (not a station) and a time, and
returns a door-to-door itinerary: first-mile walk, transit leg(s) via a
Dijkstra pathfinder over the station graph, last-mile walk, bus-bridge legs
where relevant. It is responsive to live conditions -- an active
`TrainServiceAlerts` disruption reroutes the whole itinerary via the
LTA-arranged free bus bridge and is shown **side by side** with the original
so the commuter can judge the trade-off, exactly as 3.2.3 asks. Timing is
shown as a min-typical-max range, not one confident number.

**3.2.2 GIS on OpenStreetMap** -- MapLibre GL JS renders an OSM-derived
raster basemap (CARTO's free, no-key basemap tiles, built from OpenStreetMap
data -- chosen specifically so the app never hits `tile.openstreetmap.org`,
per the brief's tile-usage policy) with `© OpenStreetMap contributors ©
CARTO` always visible. Station footprints and a small covered-linkway layer
are rendered as GeoJSON overlays.

**3.2.3 Visualisation** -- the route is drawn as coloured segments (green =
normal, **red = disrupted**, teal = free bus bridge, amber = exposed-to-rain
walk, blue = sheltered walk), with a legend "sign" underneath. Crowding is a
plain three-level chip (L/M/H), never a chart. The alternative route is a
one-tap comparison, not a forced replacement.

## Beyond the brief -- what stands out

- **Underground / no-signal resilience.** Every successful plan is rendered
  as a text-based digital ticket and written to `localStorage`
  (`web/src/utils/offlineCache.ts`). The app listens for the browser's
  `offline` event; the instant signal drops, it shows the cached ticket
  instead of trying (and failing) to replan live. Verified end-to-end with a
  Playwright smoke test (see `Testing` below).
- **Accessibility / elderly mode.** Wheelchair/stroller mode; if
  `FacilitiesMaintenance` reports the destination station's lift as faulty,
  the planner automatically reroutes to the nearest station with a working
  lift and inserts a wheelchair-accessible (`WAB`) bus leg for the last mile.
  Font-size control (90%-180%), a high-contrast theme, and an age-gated
  onboarding tutorial (large text, short slides, language picker) ship in
  the same build.
- **AI transit copilot.** Structured `TrainServiceAlerts` + weather nowcast +
  `PCDForecast` + bus-bunching context is sent to Gemini (via Vertex AI or
  the Gemini API, whichever key is configured) with the brief's exact
  prompt contract: one imperative action sentence + 3 bullets, no filler. A
  deterministic rule-based generator with the *same output contract* is the
  fallback so the feature always demos, and the UI always labels which one
  answered.
- **Proactive crowd nudge.** Reads `PCDForecast`'s 30-minute slots and, if
  the platform is forecast High at the planned arrival time, proposes a
  15-minute shift and shows the resulting (lower) forecast level --
  before anything has gone wrong, per 2.4's own framing of this endpoint.
- **Rain-aware sheltered routing.** A `CoveredLinkway`-style layer is
  checked against the 2-hour nowcast; if it's raining and no sheltered path
  exists, the walk is flagged "exposed" and its time penalised; if one
  exists, the walk is rerouted through it instead.
- **Bus bunching.** Reads the `Load` field across buses on the same service
  at a stop; if a near-full bus is about to be followed within a few minutes
  by a near-empty one, the app tells the commuter to skip the first.
- **Gamified crowd-easing + community verification (TransitPoints).**
  Following a crowd nudge earns points. Commuters can also confirm a lift's
  real status on-site to earn points -- gated by an on-site photo *and* a
  150m geolocation check (not just a tap), because unverified self-report is
  exactly the risk called out in the brief. Repeated contradicted reports
  (5 within the tracking window) suspend that user's reporting for 30 days.
  Points redeem for small real-world rewards (SimplyGo credit, FairPrice/7-Eleven/Toast
  Box vouchers) at a cost well under the value of preventing one crowded
  platform (see `Economics` below).
- **Calendar-lite "must leave by".** A lightweight appointment planner
  calculates the actual leave-by time from a live route plan, and refines
  itself using a per-user learned walking speed (rolling average of
  completed "Walking mode" sessions, with a running-speed outlier filter) --
  directly serving Mdm Lim's "leave by 11am for a 12pm appointment" scenario.
- **Walking mode.** A bottom sheet that turns each walking leg into
  large-text, one-step-at-a-time guidance with a vibration cue on every step
  change and optional spoken instructions, plus real terrain ("gentle
  slope") not just distance.

## Architecture

```
server/   Express + TypeScript API. No build step -- runs directly via tsx.
  src/adapters/   One file per external API (LTA DataMall, OneMap, data.gov.sg,
                  Vertex AI/Gemini). Each function tries the live endpoint,
                  and falls back to a fixture in src/data/ on any failure,
                  tagging the response source:"live"|"demo-fixture".
  src/data/       Fixtures mirroring each API's actual response shape,
                  plus the illustrative station/line graph (see Data below).
  src/lib/        Routing graph (Dijkstra over a small station graph),
                  the journey-planning orchestrator, geo helpers.
  src/store/      In-memory TransitPoints ledger (would be a real DB in prod).

web/      Vite + React + TypeScript, mobile-first, MapLibre GL JS for the map.
          No server-side rendering, no router library needed for a single
          screen app -- state lives in React context (web/src/state/settings.tsx)
          plus a couple of localStorage-backed hooks (offline ticket cache,
          learned walking speed, appointments).
```

## Data

`server/src/data/` ships **illustrative** fixtures, not a scrape of the real
DataMall/OSM datasets (this repo doesn't include the actual
`AmendmenttoMP2014RailStation.geojson` extract from the brief). Station
positions are approximate but geographically plausible; the disruption,
lift-outage, bus-bunching and rain scenarios are deliberately seeded so the
three personas' journeys exercise every response path end-to-end without
waiting for a real disruption -- exactly the allowance the brief gives in
section 2.6. Swapping in the real GeoJSON / live DataMall feed only touches
`server/src/data/stations.ts` and the adapters in `server/src/adapters/`; the
routing, disruption and UI logic are unchanged.

To go live, set in `server/.env` (copy from `.env.example`):

| Key | Unlocks |
|---|---|
| `LTA_ACCOUNT_KEY` | Real `TrainServiceAlerts`, `PCDRealTime`/`PCDForecast`, `FacilitiesMaintenance`, `v3/BusArrival` |
| *(none)* | data.gov.sg's 2-hour nowcast is free/no-key and is always attempted live first |
| `GEMINI_API_KEY` | Live Gemini narrative generation (simplest path) |
| `VERTEX_ACCESS_TOKEN` + `GOOGLE_CLOUD_PROJECT` | Live Vertex AI Gemini instead (run `export VERTEX_ACCESS_TOKEN=$(gcloud auth print-access-token)`, refresh hourly) |

OneMap geocoding is attempted live unconditionally (it's a free public
endpoint) and falls back to a small local postal-code table.

## Testing

- `npm run typecheck` -- strict TypeScript across both workspaces.
- `npm run build:web` -- production build.
- The core journey-planning logic was smoke-tested via `curl` against
  `/api/route/plan` for all three personas, including the disruption +
  lift-outage + bus-bunching compound scenario for Mdm Lim.
- The full UI flow (onboarding -> plan -> disruption/crowd/lift cards ->
  alternative-route comparison -> points -> accessibility panel -> going
  offline mid-session) was exercised with a headless-Chromium Playwright
  script at a 390x844 mobile viewport, with zero JS console errors.
- **Live LTA DataMall could not be exercised from the build environment**:
  its egress network policy blocks `datamall2.mytransport.sg` outright (not
  an app bug -- confirmed via the proxy's own status endpoint), so an
  `LTA_ACCOUNT_KEY` set there still falls back to the demo fixtures. It will
  work as soon as this runs somewhere with normal internet access (a laptop,
  the actual judging machine) -- the adapter code path is identical either
  way. One consequence of not being able to see a real response: the exact
  live field names for `FacilitiesMaintenance` and `v3/BusArrival` haven't
  been cross-checked against the DataMall PDF spec (not included in this
  repo). `server/src/adapters/lta.ts` validates the response *envelope*
  shape and falls back to the fixture on a mismatch rather than passing
  through wrong data silently, but the field names inside each record
  (`server/src/data/facilities.ts`'s `LiftStatus`) are a best guess --
  verify against a real response before depending on the lift-outage
  reroute in a live judged demo.

## Known limitations (see write-up for the full list)

- Map tiles need outbound network access to a tile CDN (CARTO by default);
  the route/station/crowd layers themselves render regardless.
- "Underground, no signal" is handled for the realistic case -- the app
  already open, then losing signal. Surviving a **cold reload** with zero
  connectivity would need a service worker precaching the app shell; that's
  clean follow-up work, not done here.
- True background (screen-off) turn-by-turn walking guidance isn't possible
  in a plain web app; Walking mode works with the tab open/foregrounded.
- Language selection is stored and shown in onboarding; full UI translation
  is scoped but not built out for every string.
- The station graph and postal geocoder are illustrative fixtures scoped to
  the three personas' corridors, not the full network (see `Data` above).
