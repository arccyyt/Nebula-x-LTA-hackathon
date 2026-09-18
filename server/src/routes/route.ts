import { Router } from "express";
import { planJourney, type PlanInput } from "../lib/planJourney.js";

export const routeRouter = Router();

routeRouter.post("/plan", async (req, res) => {
  const body = req.body as Partial<PlanInput>;
  if (!body.originPostal || !body.destPostal || !body.persona) {
    res.status(400).json({ error: "originPostal, destPostal and persona are required" });
    return;
  }
  try {
    const result = await planJourney({
      originPostal: body.originPostal,
      destPostal: body.destPostal,
      departAt: body.departAt,
      persona: body.persona,
      mobility: body.mobility,
      avoidRain: body.avoidRain,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not plan journey", detail: (err as Error).message });
  }
});
