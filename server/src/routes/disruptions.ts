import { Router } from "express";
import { getTrainServiceAlerts, setDemoDisruption } from "../adapters/lta.js";
import { DEMO_META } from "../data/alerts.js";

export const disruptionsRouter = Router();

disruptionsRouter.get("/", async (_req, res) => {
  const alerts = await getTrainServiceAlerts();
  res.json({ ...alerts, meta: alerts.source === "demo-fixture" ? DEMO_META : undefined });
});

disruptionsRouter.post("/demo-toggle", (req, res) => {
  const active = Boolean((req.body as { active?: boolean })?.active);
  setDemoDisruption(active);
  res.json({ active });
});
