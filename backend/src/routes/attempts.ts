import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { makeJobQueue } from "../lib/queue";

const router = Router();

const Body = z.object({
  problemId: z.number().int().positive(),
  code: z.string().min(1),
  language: z.enum(["javascript", "js", "python", "cpp"]).default("javascript"),
});

// CREATE attempt (enqueue only)
router.post("/", requireAuth, async (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const { problemId, code, language } = parsed.data;
  const userId = (req as any).user.sub as number;

  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { id: true },
  });
  if (!problem) return res.status(404).json({ error: "Problem not found" });

  const attempt = await prisma.attempt.create({
    data: {
      userId, problemId, code, language,
      status: "SUBMITTED",
      passedCount: 0, totalCount: 0,
      runtimeMs: null, logs: null, errorMessage: null,
    },
    select: {
      id: true, problemId: true, status: true, passedCount: true, totalCount: true,
      runtimeMs: true, submittedAt: true, language: true, logs: true, errorMessage: true,
    },
  });

  // Enqueue (DB queue is a no-op, but keeps API decoupled; SQS later)
  await makeJobQueue().enqueueAttempt({ attemptId: attempt.id, language });

  return res.status(201).json(attempt);
});

// LIST attempts (optionally by problem)
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).user.sub as number;
  const problemId = req.query.problemId ? Number(req.query.problemId) : undefined;
  if (req.query.problemId && (Number.isNaN(problemId) || problemId! <= 0)) {
    return res.status(400).json({ error: "Invalid problemId" });
  }

  const attempts = await prisma.attempt.findMany({
    where: { userId, ...(problemId ? { problemId } : {}) },
    orderBy: { id: "desc" },
    take: 50,
    select: {
      id: true, problemId: true, status: true, passedCount: true, totalCount: true,
      runtimeMs: true, submittedAt: true, language: true, logs: true, errorMessage: true,
    },
  });

  res.json(attempts);
});

// SUMMARY (latest per problem)
router.get("/summary", requireAuth, async (req, res) => {
  const userId = (req as any).user.sub as number;

  const latest = await prisma.attempt.groupBy({
    by: ["problemId"],
    _max: { id: true },
    where: { userId },
  });

  const latestIds = latest.map(r => r._max.id).filter((x): x is number => !!x);
  if (latestIds.length === 0) return res.json([]);

  const rows = await prisma.attempt.findMany({
    where: { id: { in: latestIds } },
    include: {
      problem: { select: { id: true, title: true, difficulty: true } },
    },
  });

  res.json(rows.map(r => ({
    problemId: r.problemId,
    status: r.status,
    submittedAt: r.submittedAt,
    problem: { id: r.problem.id, title: r.problem.title, difficulty: r.problem.difficulty },
  })));
});

// DETAIL (includes logs/errorMessage)
router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

  const userId = (req as any).user.sub as number;
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    select: {
      id: true, userId: true, problemId: true, code: true, language: true, status: true,
      passedCount: true, totalCount: true, runtimeMs: true, submittedAt: true,
      logs: true, errorMessage: true,
    },
  });

  if (!attempt) return res.status(404).json({ error: "Not found" });
  if (attempt.userId !== userId) return res.status(403).json({ error: "Forbidden" });

  res.json(attempt);
});

export default router;
