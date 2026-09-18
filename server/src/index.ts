import "dotenv/config";
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

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Smart Commuter Companion API listening on http://localhost:${port}`);
});
