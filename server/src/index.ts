import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { routeRouter } from "./routes/route.js";
import { disruptionsRouter } from "./routes/disruptions.js";
import { stationsRouter } from "./routes/stations.js";
import { pointsRouter } from "./routes/points.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, demoMode: !process.env.LTA_ACCOUNT_KEY });
});

app.use("/api/route", routeRouter);
app.use("/api/disruptions", disruptionsRouter);
app.use("/api/stations", stationsRouter);
app.use("/api/points", pointsRouter);

// Single-service deployment: if the frontend has been built (web/dist),
// serve it from this same process -- one web service to host instead of
// two, and no CORS/proxy wiring needed since it's all one origin. Local
// dev keeps using two processes (Vite's dev server + this API) via the
// proxy in web/vite.config.ts; this branch only activates once dist exists.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Smart Commuter Companion listening on http://localhost:${port}`);
  console.log(fs.existsSync(webDist) ? "Serving built frontend from " + webDist : "API only -- run the web workspace's dev server separately for the frontend");
});
