import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/", async (_req, res) => {
  const problems = await prisma.problem.findMany({
    select: { id: true, title: true, difficulty: true },
    orderBy: { id: "asc" },
  });
  res.json(problems);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const problem = await prisma.problem.findUnique({ where: { id } });
  if (!problem) return res.status(404).json({ error: "Not found" });

  res.json(problem);
});

export default router;
