# Write-up — Commute Companion SG

We built Commute Companion SG primarily for Mdm Lim: a commuter travelling
from Bedok to Singapore General Hospital for a fortnightly appointment, who
uses a wheelchair, avoids stairs, needs working lifts and sheltered
walkways, and will not improvise a reroute on the platform if something
goes wrong. We chose her as the primary persona because the brief itself
flags her as the hardest of the three to serve well, and because a wrong
answer in her case has the highest real cost — a broken lift with no
fallback does not just cost her a few minutes, it can strand her. Rachel
and Arjun, the other two personas from the brief, are not token additions.
Rachel's fixed Tampines-to-Raffles-Place commute runs through the same
disruption scenario used throughout the demo, so her framing of "a
fifteen-minute delay costs a meeting" is directly testable rather than
asserted. Arjun's Punggol-to-one-north trip is the one wired to the
crowd-forecast nudge feature, which mirrors almost exactly the example the
brief itself gives. Switching between the three personas in the app is a
real change of state — postal codes, mobility mode, default font size and
default departure time all update together — not a cosmetic label.

On architecture, the app is a small monorepo: an Express and TypeScript
backend, and a Vite, React and MapLibre frontend, deliberately kept as one
deployable service rather than two. The single architectural decision
worth calling out is how every external data source is handled. Each one —
LTA DataMall, data.gov.sg, OneMap, Gemini — sits behind an adapter that
always tries the real endpoint first and only falls back to a labelled
fixture if that call fails. This buys three things at once: the app is
fully runnable and judgeable with zero API keys, since the fixtures mirror
the real response shapes; turning on a real key later requires touching
nothing in the routing, disruption or UI logic, because the same code path
simply starts receiving real data instead of a fixture; and every response
carries a plain "live" or "demo-fixture" tag that surfaces in the UI as a
small badge, so nobody has to take our word for what is real. The routing
itself runs on a small Dijkstra pathfinder over a hand-built station graph,
not a call out to OSRM, GraphHopper or OneMap's own transit router — the
reasoning for that shortcut, and what replacing it would involve, is
covered under Assumptions below.

We submitted this running on Google Cloud Run, as the hackathon rules
require deployment on GCP using the provided credits. The live URL is
https://commute-companion-sg-611005443072.asia-southeast1.run.app. We chose
Cloud Run over App Engine or a raw Compute Engine VM because it matches
what this app actually needs: a single stateless HTTP service that will see
bursty, low traffic around demo day and can otherwise scale to zero, which
is the most efficient way to spend limited hackathon credit on something
that mostly sits idle. The container is built from a Dockerfile we wrote by
hand rather than relying on Google's Cloud Buildpacks to auto-detect the
project, because this is an npm-workspaces monorepo and buildpack
auto-detection on that shape is unpredictable enough that writing the four
build steps out ourselves was the safer choice. That decision surfaced a
real gotcha worth naming: buildpacks and most platform-as-a-service hosts
strip devDependencies before running the app, and our server originally ran
through `tsx`, a devDependency, at runtime. We caught this before it broke
a deploy by researching Google's own buildpack documentation rather than
guessing, then fixed it by compiling the server to plain JavaScript ahead
of time and running it with plain `node`. One honest gap remains on the
deployment side: the sandboxed environment we built this in had its
outbound network access blocked at the infrastructure level, so every
adapter fell back to its fixture throughout development regardless of
whether a key was configured. Cloud Run does not have that restriction, but
nobody has yet confirmed that a real LTA key actually flips the badges to
"live" on the deployed instance — that is untested, not working, until
someone checks it.

A few assumptions shaped what got built and are worth stating plainly
rather than leaving implicit. The station and line network is illustrative,
not the full Singapore rail network: the real station footprint dataset
named in the brief is not included in this repository, so we hand-authored
roughly twenty stations and four line sequences covering the three
personas' corridors, plus enough interchanges to keep the pathfinder
generic rather than hardcoded per trip. This is the single biggest gap
between this submission and one built directly on the authoritative
geospatial data, though the seam to close it is narrow by design — swapping
in a loader over the real station GeoJSON would leave the rest of the
routing, disruption-matching and crowd-forecast logic untouched. Walking
and cycling directions are a straight-line-and-bearing approximation rather
than a real pedestrian graph; the OneMap geocoder call is live and real,
but the walking route itself is synthesised rather than routed through
OSRM or GraphHopper, which is the natural next step we scoped out only for
lack of time. The disruption scenario shown in the demo is injected rather
than waited for, exactly as the brief itself anticipates in its own notes —
the live TrainServiceAlerts feed is empty on an ordinary day, so a labelled
signalling-fault scenario is replayed by default so that the free-bus-
bridge, alternative-route comparison and AI narrative can all be exercised
without waiting for a real fault to occur; it can be switched off to show
the ordinary-day path, which is also fully implemented rather than stubbed.
The crowd forecast is driven by a synthetic peak curve rather than a real
PCDForecast payload, again for lack of a live-tested key during
development, and is offered as a reasonable stand-in for demonstrating the
nudge logic rather than a claim about actual Singapore ridership patterns.
Finally, the AI narrative's rule-based fallback is not a disguised
substitute for the real feature — it exists so the feature always works
without a paid key, is visibly labelled as a fallback rather than as
Gemini in the interface, and is held to the same output contract the brief
specifies, one imperative sentence with an ETA delta followed by three
concise bullets, whichever of the two paths actually answered.

On the gamification economics, TransitPoints are priced well under the
value of the friction they are meant to prevent: shifting a commuter off a
crowded platform for fifteen minutes costs thirty points, redeemable for
thirty cents of SimplyGo credit, and a verified lift report costs ten. We
are not claiming these numbers against any real LTA cost-of-crowding
figure — they are a stated design assumption, not a measured one. The
anti-troll safeguard behind the reporting feature — an on-site photo, a
geolocation check within a hundred and fifty metres, and a five-strikes,
thirty-day reporting suspension mirroring the threshold the brief itself
suggests — exists because the brief explicitly warns that relying on
unverified self-reports is risky when an official feed already covers
major disruptions. That is also why points are deliberately not offered
for reporting train delays at all, only for the kind of ad-hoc fact LTA's
own feeds do not already know: whether a specific lift is working right
now, or whether a specific platform is actually crowded right now.

On privacy, everything the app stores lives in the browser's local
storage and nowhere else in this build: the current cached itinerary,
learned walking-speed samples, saved appointments and display preferences.
The gamification backend keeps a per-user points ledger and submission
history in server memory only, tied to a guest identifier generated on the
client rather than any real identity, with no database and no persistence
across a server restart. Geolocation is requested only at the moment a
facility-verification report is submitted, used solely to check proximity
to the facility being reported on, and is not stored afterward.

Nothing in this write-up was left implicit for a judge to discover on
their own: the data-source badges, the fallback label on the AI narrative,
and the walking-mode disclaimer about needing the browser tab open are all
visible in the running app itself, not only described here. The fuller,
more granular list of limitations — the exact caveat around how the
offline service worker's cache gets primed, the state of internationalisation,
and so on — lives in the README alongside the setup instructions, since
that is the document a judge will actually be running the app from.
