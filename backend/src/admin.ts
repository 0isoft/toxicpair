// server/admin.ts
import { Router } from "express";
import { PrismaClient, AttemptStatus } from "@prisma/client";

const prisma = new PrismaClient();
const admin = Router();

// Replace with your real auth middleware; must set req.user = { email, id, ... }
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  next();
}

admin.get("/kpis", requireAuth, async (req: any, res) => {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const userEmail = (req.user?.email || "").toLowerCase();
  if (!adminEmail || userEmail !== adminEmail) {
    return res.status(403).json({ error: "forbidden" });
  }

  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));

  // Use ONLY PrismaPromise items in the array form:
  const [
    userCount,
    problemCount,
    attemptCount,
    passedCount,
    newUsersByDay,
    dau,
    attemptsByDay,
    passRateByDay,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.problem.count(),
    prisma.attempt.count(),
    prisma.attempt.count({ where: { status: AttemptStatus.PASSED } }),

    // New users per day (last N days)
    prisma.$queryRaw<{ d: Date; n: number }[]>`
      SELECT date_trunc('day', "createdAt")::date AS d, COUNT(*)::int AS n
      FROM "User"
      WHERE "createdAt" >= now() - ${days} * interval '1 day'
      GROUP BY 1 ORDER BY 1
    `,

    // DAU via attempts (distinct users per day)
    prisma.$queryRaw<{ d: Date; n: number }[]>`
      SELECT date_trunc('day', a."submittedAt")::date AS d,
             COUNT(DISTINCT a."userId")::int AS n
      FROM "Attempt" a
      WHERE a."submittedAt" >= now() - ${days} * interval '1 day'
      GROUP BY 1 ORDER BY 1
    `,

    // Attempts per day
    prisma.$queryRaw<{ d: Date; total: number }[]>`
      SELECT date_trunc('day', a."submittedAt")::date AS d,
             COUNT(*)::int AS total
      FROM "Attempt" a
      WHERE a."submittedAt" >= now() - ${days} * interval '1 day'
      GROUP BY 1 ORDER BY 1
    `,

    // Pass rate per day
    prisma.$queryRaw<{ d: Date; total: number; passed: number; pass_rate_pct: number }[]>`
      WITH daily AS (
        SELECT date_trunc('day', a."submittedAt")::date AS d,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE a."status" = 'PASSED')::int AS passed
        FROM "Attempt" a
        WHERE a."submittedAt" >= now() - ${days} * interval '1 day'
        GROUP BY 1
      )
      SELECT d, total, passed,
             CASE WHEN total = 0 THEN 0 ELSE ROUND(100.0 * passed / total, 2) END AS pass_rate_pct
      FROM daily
      ORDER BY d
    `,
  ]);

  res.json({
    days,
    totals: {
      users: userCount,
      problems: problemCount,
      attempts: attemptCount,
      passed: passedCount,
    },
    newUsersByDay,
    dau,
    attemptsByDay,
    passRateByDay,
  });
});

export default admin;
