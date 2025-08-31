// backend/src/routes/sessions.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { getOrCreateProblemSession, computeDeadlineFromSession } from "../lib/sessions";
import { AttemptStatus } from "@prisma/client";

const router = Router();

function getUserId(req: any): number {
    return Number(req.user?.sub ?? req.user?.id);
}

async function ensureSwitcheroos(sessionId: string, timeLimitSeconds: number | null, policy: any) {
    if (!timeLimitSeconds || !policy?.drops?.length) return;
    const existing = await prisma.sessionTimerEvent.count({ where: { sessionId } });
    if (existing > 0) return;

    const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { createdAt: true } });
    const startMs = (session?.createdAt ?? new Date()).getTime();

    const drops: Array<{ atSecondsRemaining: number; deltaSeconds: number; message?: string }> = policy.drops;
    const events = drops
        .filter(d => d.atSecondsRemaining > 0)
        .map(d => ({
            sessionId,
            executeAt: new Date(startMs + (timeLimitSeconds - d.atSecondsRemaining) * 1000),
            deltaSeconds: d.deltaSeconds,
            message: d.message ?? "Oops, the project manager says the timeline has advanced!!",
        }));
    if (events.length) await prisma.sessionTimerEvent.createMany({ data: events });
}

// POST /api/sessions  { problemId, personaId, forceNew? }
router.post("/", requireAuth, async (req: any, res, next) => {
    try {
        const { problemId, personaId, forceNew } =
            req.body as { problemId?: number; personaId?: string; forceNew?: boolean };
        if (!problemId || !Number.isInteger(problemId)) {
            return res.status(400).json({ error: "problemId required" });
        }

        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            select: {
                editorMode: true,
                timeLimitSeconds: true,
                allowSwitcheroo: true,
                switcherooPolicy: true,
            },
        });
        if (!problem) return res.status(404).json({ error: "Problem not found" });

        // Load persona row once (explicit > default)
        const personaRow = await prisma.persona.findUnique({
            where: { id: personaId ?? "" },
            select: {
                id: true, systemPrompt: true, model: true, temperature: true, config: true
            },
        });
        let sessionId: string;
        let sessionCreatedAt: Date;

        if (forceNew) {
            // always make a brand new session (don’t reuse old chat)
            const created = await prisma.session.create({
                data: {
                    problem: { connect: { id: problemId } },
                    ...(personaId ? { persona: { connect: { id: personaId } } } : {}),
                    // snapshot persona knobs on creation
                    personaModel: personaRow?.model ?? "gpt-4o-mini",
                    personaTemperature: personaRow?.temperature ?? 0.4,
                    personaSystemPrompt: personaRow?.systemPrompt ?? "You are a helpful coding assistant.",
                    // ⬇⬇ change here
                    personaConfig: personaRow?.config ?? undefined,
                    participants: {
                        create: { user: { connect: { id: getUserId(req) } }, role: "editor" },
                    },
                },
                select: { id: true, createdAt: true },
            });
            sessionId = created.id;
            sessionCreatedAt = created.createdAt;

            await prisma.session.updateMany({
                where: {
                    id: { not: sessionId },
                    problemId,
                    status: "active",
                    participants: { some: { userId: getUserId(req) } },
                    ...(personaRow?.id ? { personaId: personaRow.id } : {}),
                },
                data: { status: "ended" },
            });
        } else {
            // reuse-or-create (but make sure a new one snapshots knobs if created)
            sessionId = await getOrCreateProblemSession(
                getUserId(req),
                problemId,
                personaRow?.id,
                {
                    personaModel: personaRow?.model ?? "gpt-4o-mini",
                    personaTemperature: personaRow?.temperature ?? 0.4,
                    personaSystemPrompt: personaRow?.systemPrompt ?? "You are a helpful coding assistant.",
                    personaConfig: personaRow?.config ?? null,
                }
            );
            const s = await prisma.session.findUnique({
                where: { id: sessionId },
                select: { createdAt: true },
            });
            sessionCreatedAt = s?.createdAt ?? new Date();
        }

        // schedule switcheroos once per session
        if (problem.allowSwitcheroo && problem.switcherooPolicy && problem.timeLimitSeconds) {
            const existingEvents = await prisma.sessionTimerEvent.count({ where: { sessionId } });
            if (existingEvents === 0) {
                const policy = problem.switcherooPolicy as any;
                const drops: Array<{ atSecondsRemaining: number; deltaSeconds: number; message?: string }> = policy?.drops ?? [];
                const startMs = sessionCreatedAt.getTime();
                const events = drops
                    .filter(d => d.atSecondsRemaining > 0)
                    .map(d => ({
                        sessionId,
                        executeAt: new Date(startMs + (problem.timeLimitSeconds! - d.atSecondsRemaining) * 1000),
                        deltaSeconds: d.deltaSeconds,
                        message: d.message ?? "Oops, the project manager says the timeline has advanced!!",
                    }));
                if (events.length) await prisma.sessionTimerEvent.createMany({ data: events });
            }
        }

        // compute deadline/remaining
        const deadlineAt = await computeDeadlineFromSession(sessionId, problem.timeLimitSeconds ?? null);
        const remainingSeconds = deadlineAt
            ? Math.max(0, Math.floor((deadlineAt.getTime() - Date.now()) / 1000))
            : null;

        res.json({
            sessionId,
            attemptId: null,
            editorMode: problem.editorMode ?? "CODE",
            deadlineAt,
            timeLimitSeconds: problem.timeLimitSeconds ?? null,
            remainingSeconds,
        });
    } catch (err) {
        next(err);
    }
});


// GET /api/sessions/:id → apply due switcheroos and return remaining time
router.get("/:id", requireAuth, async (req: any, res, next) => {
    try {
      const userId = getUserId(req);
      const sessionId = req.params.id;
  
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          status: true,
          problemId: true,
          problem: { select: { editorMode: true, timeLimitSeconds: true } },
        },
      });
      if (!session) return res.status(404).json({ error: "Not found" });
  
      // Guard: Prisma types problemId as number | null
      if (session.problemId == null) {
        // If this "can't happen" in your data model, surfacing 500 is fine
        return res.status(500).json({ error: "Session missing problemId" });
      }
      const problemId = session.problemId;
  
      // Latest attempt for this (user, problem)
      const latest = await prisma.attempt.findFirst({
        where: { userId, problemId },
        orderBy: { id: "desc" },
        select: { status: true },
      });
      const completed = latest?.status === AttemptStatus.PASSED;
  
      if (completed) {
        if (session.status === "active") {
          await prisma.session.update({ where: { id: sessionId }, data: { status: "ended" } });
        }
        res.set("Cache-Control", "no-store");
        return res.json({
          sessionId,
          attemptId: null,
          status: "completed",
          deadlineAt: null,
          remainingSeconds: null,
          editorMode: session.problem?.editorMode ?? "CODE",
        });
      }
  
      // Apply due switcheroos
      const now = new Date();
      const due = await prisma.sessionTimerEvent.findMany({
        where: { sessionId, applied: false, executeAt: { lte: now } },
        orderBy: { executeAt: "asc" },
      });
      if (due.length) {
        await prisma.$transaction([
          prisma.sessionTimerEvent.updateMany({
            where: { id: { in: due.map((d) => d.id) } },
            data: { applied: true },
          }),
          prisma.chatMessage.createMany({
            data: due.map((d) => ({
              sessionId,
              role: "SYSTEM",
              text: d.message ?? "Oops, the project manager says the timeline has advanced!!",
            })),
          }),
        ]);
      }
  
      const timeLimit = session.problem?.timeLimitSeconds ?? null;
      const deadlineAt = await computeDeadlineFromSession(sessionId, timeLimit);
      const remainingSeconds = deadlineAt
        ? Math.max(0, Math.floor((deadlineAt.getTime() - Date.now()) / 1000))
        : null;
  
      res.set("Cache-Control", "no-store");
      res.json({
        sessionId,
        attemptId: null,
        status: remainingSeconds === 0 ? "expired" : "active",
        deadlineAt,
        remainingSeconds,
        editorMode: session.problem?.editorMode ?? "CODE",
      });
    } catch (err) {
      next(err);
    }
  });

// POST /api/sessions/:id/expire → mark latest active attempt as FAILED & clear chat
router.post("/:id/expire", requireAuth, async (req: any, res, next) => {
    try {
        const userId = getUserId(req);
        const sessionId = req.params.id;

        const attempt = await prisma.attempt.findFirst({
            where: { userId, status: { in: [AttemptStatus.RUNNING, AttemptStatus.SUBMITTED] } },
            orderBy: { id: "desc" },
        });

        if (attempt) {
            await prisma.$transaction([
                prisma.attempt.update({
                    where: { id: attempt.id },
                    data: { status: AttemptStatus.FAILED, finishedAt: new Date(), timedOut: true },
                }),
                prisma.chatMessage.deleteMany({ where: { sessionId } }),
            ]);
        }

        // also end the session so a new one can be created next time
        await prisma.session.updateMany({ where: { id: sessionId, status: "active" }, data: { status: "ended" } });

        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

export default router;


router.post("/:id/complete", requireAuth, async (req: any, res, next) => {
    try {
        const userId = getUserId(req);
        const sessionId = req.params.id;

        const session = await prisma.session.findFirst({
            where: {
                id: sessionId,
                participants: { some: { userId } },
            },
            select: { id: true, status: true },
        });
        if (!session) return res.status(404).json({ error: "Not found" });

        if (session.status !== "ended") {
            await prisma.session.update({ where: { id: sessionId }, data: { status: "ended" } });
        }
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});