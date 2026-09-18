import { Router } from "express";
import { balance, submitVerification, redeem, REWARDS, awardNudgeFollowed, submissionsFor } from "../store/points.js";

export const pointsRouter = Router();

pointsRouter.get("/balance/:userId", (req, res) => {
  res.json(balance(req.params.userId));
});

pointsRouter.get("/rewards", (_req, res) => {
  res.json(REWARDS);
});

pointsRouter.get("/history/:userId", (req, res) => {
  res.json(submissionsFor(req.params.userId));
});

pointsRouter.post("/verify", (req, res) => {
  const body = req.body as {
    userId: string;
    facility: string;
    claim: "clear" | "broken" | "crowded";
    evidencePhotoProvided: boolean;
    userPos: { lat: number; lng: number };
    targetPos: { lat: number; lng: number };
  };
  const result = submitVerification(body);
  res.status(result.ok ? 200 : 422).json(result);
});

pointsRouter.post("/nudge-followed", (req, res) => {
  const { userId } = req.body as { userId: string };
  res.json(awardNudgeFollowed(userId));
});

pointsRouter.post("/redeem", (req, res) => {
  const { userId, rewardId } = req.body as { userId: string; rewardId: string };
  const result = redeem(userId, rewardId);
  res.status(result.ok ? 200 : 422).json(result);
});
