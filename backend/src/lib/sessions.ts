// backend/src/lib/sessions.ts
import { prisma } from "../lib/prisma";

//for timed attempts
export async function findActiveSessionFor(userId: number, problemId: number) {
    return prisma.session.findFirst({
      where: {
        problemId,
        status: "active",
        participants: { some: { userId } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
export async function computeDeadlineFromSession(
  sessionId: string,
  timeLimitSeconds: number | null
): Promise<Date | null> {
  if (!timeLimitSeconds) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { createdAt: true },
  });
  if (!session) return null;

  // If you have switcheroo events:
  let deltaSeconds = 0;
  try {
    const now = new Date();
    const events = await prisma.sessionTimerEvent.findMany({
      where: { sessionId, executeAt: { lte: now } },
      select: { deltaSeconds: true },
    });
    deltaSeconds = events.reduce((s, e) => s + e.deltaSeconds, 0);
  } catch {
    // table may not exist yet → ignore gracefully
  }

  const base = session.createdAt.getTime() + timeLimitSeconds * 1000;
  return new Date(base + deltaSeconds * 1000);
}

export async function getOrCreateProblemSession(
    userId: number,
    problemId: number,
    personaId?: string,
    snapshot?: { personaModel?: string|null; personaTemperature?: number|null; personaSystemPrompt?: string|null; personaConfig?: any|null },
    opts?: { forceNew?: boolean; }
  ): Promise<string> {
    if (!opts?.forceNew) {
      const session = await prisma.session.findFirst({
        where: {
          problemId,
          status: "active",
          participants: { some: { userId } },
          ...(personaId ? { personaId } : { personaId: { equals: null } }),
        },
        select: { id: true },
      });
      if (session) return session.id;
    }
  
    // Optionally end previous actives for cleanliness
    await prisma.session.updateMany({
      where: {
        problemId,
        status: "active",
        participants: { some: { userId } },
        ...(personaId ? { personaId } : { personaId: { equals: null } }),
      },
      data: { status: "ended" },
    });
  
    const created = await prisma.session.create({
      data: {
        problem: { connect: { id: problemId } },
        ...(personaId ? { persona: { connect: { id: personaId } } } : {}),
        personaModel: snapshot?.personaModel ?? null,
        personaTemperature: snapshot?.personaTemperature ?? null,
        personaSystemPrompt: snapshot?.personaSystemPrompt ?? null,
        personaConfig: snapshot?.personaConfig ?? undefined,
        participants: {
          create: { user: { connect: { id: userId } }, role: "editor" },
        },
      },
      select: { id: true },
    });
  
    return created.id;
  }