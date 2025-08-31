// backend/src/routes/personas.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/problems/:id/personas", async (req, res) => {
    const problemId = Number(req.params.id);
    if (!Number.isFinite(problemId)) return res.status(400).json({ error: "Bad id" });
  
    const links = await prisma.problemPersona.findMany({
      where: { problemId },
      orderBy: { sortOrder: "asc" },
      include: { persona: true },
    });
  
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { defaultPersonaId: true },
    });
  
    // Fallback: if no links, return all active personas so UI isn’t empty
    if (links.length === 0) {
      const all = await prisma.persona.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      return res.json({
        defaultPersonaId: problem?.defaultPersonaId ?? null,
        personas: all.map((p, idx) => ({
          id: p.id,
          key: p.key,
          name: p.name,
          tagline: p.tagline,
          avatarEmoji: p.avatarEmoji,
          isDefault: p.id === problem?.defaultPersonaId || idx === 0, // mark first as default-ish
        })),
      });
    }
  
    // Normal path (linked personas)
    return res.json({
      defaultPersonaId: problem?.defaultPersonaId ?? null,
      personas: links.map((l) => ({
        id: l.persona.id,
        key: l.persona.key,
        name: l.persona.name,
        tagline: l.persona.tagline,
        avatarEmoji: l.persona.avatarEmoji,
        isDefault: l.isDefault || l.persona.id === problem?.defaultPersonaId,
      })),
    });
  });
  

export default router;
