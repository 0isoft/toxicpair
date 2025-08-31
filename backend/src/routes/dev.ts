// backend/src/routes/dev.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
const router = Router();

router.get("/ai-session-debug", async (req, res) => {
  const userId = (req as any).user?.id; // or accept ?userId=
  const problemId = Number(req.query.problemId);
  if (!userId || !problemId) return res.status(400).json({ error: "missing userId/problemId" });

  const sessions = await prisma.session.findMany({
    where: { problemId, participants: { some: { userId } } },
    select: {
      id: true, personaId: true, createdAt: true,
      personaModel: true, personaTemperature: true,
      personaSystemPrompt: true,
      persona: { select: { id: true, key: true, name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ sessions });
});

export default router;
