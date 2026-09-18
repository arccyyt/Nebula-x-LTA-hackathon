# Write-up -- Commute Companion SG

## Persona

Built primarily for **Mdm Lim** (Bedok -> Singapore General Hospital,
fortnightly appointment, wheelchair, avoids stairs, needs lifts and
sheltered walkways, large text, won't improvise on the platform). This is
the persona the brief flags as hardest to serve well, and where a wrong
answer (a broken lift with no fallback) has the highest cost to the
commuter, not just the highest inconvenience.

Rachel and Arjun are fully supported, not token personas: Rachel's fixed
Tampines -> Raffles Place trip runs through the same disruption used in the
demo (so her "a 15-minute delay costs a meeting" framing is directly
testable), and Arjun's Punggol -> one-north trip is the one wired to the
crowd-forecast nudge, matching the brief's own example almost exactly. The
persona switcher at the top of the app is a real state change (postal
codes, mobility mode, default font scale, default departure time all swap),
not a label.

## Architecture

See `README.md#architecture` for the file layout. The one architectural
decision worth calling out: every external data source is behind an
**adapter that tries the live call first and only falls back to a labelled
fixture on failure** (`server/src/adapters/*.ts`). This means:

1. The app is fully runnable and demoable with zero API keys (satisfies "a
   submission that ... runs from a clean README").
2. Turning on a real `LTA_ACCOUNT_KEY` doesn't require touching the routing,
   disruption, or UI logic at all -- the same code path just starts getting
   real data.
3. Every response carries a `source: "live" | "demo-fixture"` tag, surfaced
   in the UI as a small badge, so a judge never has to take "is this real"
   on faith -- it's stated plainly, matching the brief's warning that
   "mocked data presented as live" caps the score.

The routing itself is a small Dijkstra pathfinder over a hand-built station
graph (`server/src/lib/graph.ts`) with per-line sequences and transfer
penalties, not a call to OSRM/GraphHopper/OneMap's transit router -- see
Assumptions below for why, and what swapping it out would look like.

## Deployment

Submitted running on **Google Cloud Run**, per the hackathon's requirement
to deploy on GCP using the provided credits: **https://commute-companion-sg-611005443072.asia-southeast1.run.app**.
Cloud Run was chosen over App Engine or a raw Compute Engine VM because it
maps directly onto what this app actually needs -- a single stateless HTTP
service with bursty, low, demo-day traffic -- and scales to zero between
requests, which is the cheapest possible way to spend hackathon credit on a
service that mostly sits idle. The container is built from a hand-written
multi-stage `Dockerfile` at the repo root rather than relying on Google
Cloud Buildpacks' auto-detection: this is an npm-workspaces monorepo, and
buildpack auto-detection on that shape is less predictable than just writing
the four `COPY`/`RUN` lines out. One consequence worth flagging: Buildpacks
(and most PaaS hosts) strip devDependencies before running the app, which is
why `server/` compiles to plain JS via `tsc` and runs with `node`, not
`tsx` -- `tsx` was a devDependency the old run command needed at runtime,
which would have broken silently on first deploy.

The practical effect of deploying on GCP rather than staying in the
sandboxed environment this was built in: **outbound network access is no
longer the constraint it was during development.** Every adapter in
`server/src/adapters/` already tries the real LTA DataMall / data.gov.sg /
OneMap / Gemini endpoint first and only falls back to a fixture on failure
-- during development that fallback fired on every single call, because
this session's own network policy blocked those domains outright (verified
against the proxy's own status endpoint, not assumed). On Cloud Run, a
correctly-configured `LTA_ACCOUNT_KEY` should actually go live. That was
not verified end-to-end before submission (no time left in the session to
confirm it against a real key from GCP), so treat "live LTA data on the
deployed instance" as untested rather than working until someone checks
the `data:` badges in the running app and confirms they say `live`.

## Assumptions

- **Station/line network is illustrative, not the full network.** The brief
  provides `AmendmenttoMP2014RailStation.geojson` (208 polygons) via the
  hackathon data pack; that file isn't present in this repository, so
  `server/src/data/stations.ts` hand-authors ~20 stations and 4 line
  sequences covering exactly the three personas' corridors plus enough
  interchanges to make the pathfinder generic rather than hardcoded per
  trip. This is clearly the biggest gap versus a submission built directly
  on the real geospatial pack. The seam is deliberately narrow: swap
  `stations.ts` for a loader over the real GeoJSON (station footprints ->
  centroids, joined to line codes via the canonical line table already
  built in `server/src/lineTable.ts` to survive the STL/SLRT-style code
  mismatches) and the rest of the app -- routing, disruption matching,
  crowd forecast, UI -- is unchanged.
- **Walking/cycling routing is a straight-line + bearing synthesiser, not a
  real pedestrian graph.** `server/src/adapters/onemap.ts` calls OneMap's
  real geocoder live (it's a free public endpoint), but the *walking route*
  itself is synthesised (distance + 1-2 turn instructions from bearing)
  rather than routed over an actual OSM pedestrian graph via OSRM/GraphHopper.
  Wiring in a real OSRM instance loaded with the Geofabrik Singapore extract
  is the natural next step and was scoped out only for time -- the
  `WalkRoute` interface it returns (`steps`, `totalMinutes`, `path`) is
  already the shape a real router would need to fill.
- **Disruption is injected, not waited for.** Per the brief's own note (2.6)
  that `TrainServiceAlerts.AffectedSegments` is empty on an ordinary day, a
  labelled signalling-fault scenario (EWL, Raffles Place-Outram Park) is
  replayed by default so the free-bus-bridge, alternative-route-comparison,
  and AI-narrative paths are all exercisable without waiting for a real
  fault. It can be toggled off (`POST /api/disruptions/demo-toggle`) to see
  the normal-day path, which is also fully implemented, not stubbed.
- **Crowd forecast uses a synthetic peak curve**, not the real
  `PCDForecast` payload (again, no live key in this environment). The curve
  (High 07:30-08:30 and 17:00-18:30, Moderate either side, Low otherwise) is
  a reasonable stand-in for demoing the nudge logic, not a claim about real
  Singapore ridership patterns.
- **The AI narrative's rule-based fallback is not "the AI feature in
  disguise."** It exists so the feature always demos without a paid key,
  and is visibly labelled `Rule-based fallback` vs `Gemini` in the UI. The
  measurable thing here isn't a benchmark number (a single hackathon-scale
  prompt doesn't support one) -- it's that both paths satisfy the exact
  same output contract the brief specifies (one imperative sentence with an
  ETA delta, three bullets, no filler), verified by the `extractJson`
  parsing in `server/src/adapters/vertexai.ts` rejecting anything that
  doesn't fit that shape.

## Economics (TransitPoints)

Rewards are priced well under the value of the crowding/lift-outage
friction they prevent: shifting one commuter off a High-crowd platform for
15 minutes costs 30 points (redeemable at $0.30 SimplyGo credit); a verified
lift report costs 10 points ($0.10-equivalent). Neither is a claim backed by
a real LTA cost-of-crowding figure -- it's a design assumption, stated as
one rather than presented as measured. The anti-troll gate (on-site photo +
150m geolocation check + a 5-strikes/30-day reporting suspension, mirroring
the brief's own suggested threshold) exists specifically because the brief
flags relying on unverified self-reports as risky when an official feed
(`TrainServiceAlerts`) already covers major disruptions -- so points are
deliberately *not* offered for reporting train delays, only for the ad-hoc,
LTA-doesn't-already-know-it facts: is this specific lift working right now,
is this specific platform actually crowded right now.

## Limitations

See `README.md#known-limitations` for the full list (a service-worker
caveat -- the app shell only caches for offline use after being opened
online at least twice, an inherent property of how service workers
register, not a bug; no true background walking guidance; the illustrative
station graph; partial i18n; unverified live LTA data on the deployed
instance, per Deployment above). None of these were hidden -- each is
called out in the UI itself (data-source badges, the `Rule-based fallback`
label, the walking-mode disclaimer about needing the tab open) rather than
only in this document, per the brief's own instruction that a claim a
judge can't verify against the running app shouldn't score.

## Privacy

The app stores, all locally in the browser (`localStorage`), and nowhere
else in this build: the current cached itinerary/ticket, learned walking
speed samples, saved appointments, and display preferences. The gamification
backend keeps a per-user (guest-ID, generated client-side, not tied to any
real identity) points ledger and submission history in server memory only
(no database, no persistence across a server restart in this build).
Geolocation is requested only at the moment of a facility-verification
report, used only to check proximity to the reported facility, and is not
stored.
