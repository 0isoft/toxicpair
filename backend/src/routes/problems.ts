// routes/problems.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ProblemTier } from "@prisma/client";
import { getUnlockedMaxTier } from "../lib/progress";

const router = Router();
const TIER_ORDER: Record<ProblemTier, number> = { INTERN: 0, JUNIOR: 1, SENIOR: 2 };

function getUserId(req: any): number | undefined {
  return req.user?.id ?? req.session?.userId ?? req.res?.locals?.user?.id;
}

function setNoCache(res: any) {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Vary", "Authorization, Cookie");
}


// List problems for a tier
router.get("/", async (req, res) => {
  const q = String(req.query.tier ?? "INTERN").toUpperCase();
  if (!["INTERN", "JUNIOR", "SENIOR"].includes(q)) {
    setNoCache(res);
    return res.status(400).json({ error: "Invalid tier" });
  }
  const tier = q as ProblemTier;

  const userId = getUserId(req);
  const unlockedMax = await getUnlockedMaxTier(userId);

  // enforce server-side lock
  if (TIER_ORDER[tier] > TIER_ORDER[unlockedMax]) {
    setNoCache(res);
    return res.status(403).json({ error: "Locked", unlockedMax });
  }

  const problems = await prisma.problem.findMany({
    where: { tier, ...(userId ? {} : { isPublic: true }) },
    orderBy: { id: "asc" },
    select: {
      id: true, title: true, difficulty: true, tier: true, isPublic: true,
      // optional to show badges in lists (won’t hurt):
      editorMode: true, timeLimitSeconds: true,
    },
  });

  setNoCache(res);
  res.json(problems);
});

// Get a single problem (also gated)
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    setNoCache(res);
    return res.status(400).json({ error: "Invalid id" });
  }

  const problem = await prisma.problem.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      difficulty: true,
      tier: true,
      isPublic: true,
      description: true,
      examples: true,
      tests: true,
      defaultPersonaId: true,
      // add these:
      editorMode: true,
      timeLimitSeconds: true,
    },
  });
  if (!problem) {
    setNoCache(res);
    return res.status(404).json({ error: "Not found" });
  }

  const userId = getUserId(req);
  const unlockedMax = await getUnlockedMaxTier(userId);

  if (!userId && !problem.isPublic) {
    setNoCache(res);
    return res.status(403).json({ error: "Locked" });
  }
  if (TIER_ORDER[problem.tier] > TIER_ORDER[unlockedMax]) {
    setNoCache(res);
    return res.status(403).json({ error: "Locked", unlockedMax });
  }

  setNoCache(res);
  res.json(problem);
});

export default router;
