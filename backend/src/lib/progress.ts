import { PrismaClient, ProblemTier, AttemptStatus } from "@prisma/client";
const prisma = new PrismaClient();


async function countTotal(tier: ProblemTier) {
    return prisma.problem.count({ where: { tier } });
  }
  
  async function countPassed(userId: number, tier: ProblemTier) {
    const rows = await prisma.attempt.findMany({
      where: { userId, status: AttemptStatus.PASSED, problem: { tier } },
      distinct: ["problemId"],
      select: { problemId: true },
    });
    return rows.length;
  }

export async function getUnlockedMaxTier(userId?: number): Promise<ProblemTier> {
  // Public browsing without login: only INTERN (public)
  if (!userId) return "INTERN";

  const [ti, pj, tj] = await Promise.all([
    countTotal("INTERN"),
    countPassed(userId, "INTERN"),
    countTotal("JUNIOR"),
  ]);

  const needJunior = Math.ceil(ti / 2);
  const juniorUnlocked = pj >= needJunior;

  if (!juniorUnlocked) return "INTERN";

  const [pjr, ps] = await Promise.all([
    countPassed(userId, "JUNIOR"),
    countTotal("SENIOR"),
  ]);
  const needSenior = Math.ceil(tj / 2);
  const seniorUnlocked = pjr >= needSenior;

  return seniorUnlocked ? "SENIOR" : "JUNIOR";
}

export async function getLevelProgress(userId?: number) {
  const [ti, tj, ts] = await Promise.all([
    countTotal("INTERN"),
    countTotal("JUNIOR"),
    countTotal("SENIOR"),
  ]);
  if (!userId) {
    return {
      INTERN: { passed: 0, total: ti, neededForNext: Math.ceil(ti / 2) },
      JUNIOR: { passed: 0, total: tj, neededForNext: Math.ceil(tj / 2) },
      SENIOR: { passed: 0, total: ts, neededForNext: 0 },
      unlockedMax: "INTERN" as ProblemTier,
    };
  }
  const [pi, pj] = await Promise.all([
    countPassed(userId, "INTERN"),
    countPassed(userId, "JUNIOR"),
  ]);

  const unlockedMax = await getUnlockedMaxTier(userId);

  return {
    INTERN: { passed: pi, total: ti, neededForNext: Math.ceil(ti / 2) },
    JUNIOR: { passed: pj, total: tj, neededForNext: Math.ceil(tj / 2) },
    SENIOR: { passed: 0, total: ts, neededForNext: 0 },
    unlockedMax,
  };
}