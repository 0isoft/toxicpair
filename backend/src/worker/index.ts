import "dotenv/config";
import { prisma } from "../lib/prisma";
import { makeJobQueue } from "../lib/queue";
import { makeRunner } from "../lib/runner";
import type { TestCase } from "../lib/types";

const queue = makeJobQueue();
const runner = makeRunner();

const MAX_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 1);
const PER_TEST_MS = Number(process.env.ATTEMPT_PER_TEST_MS ?? 2000);

async function processOne() {
  const msg = await queue.receive({ waitMs: 1000 });
  if (!msg) return;

  const { attemptId } = msg.job;

  try {
    // Load attempt + associated problem/tests
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true, userId: true, problemId: true, code: true, language: true,
      },
    });
    if (!attempt) {
      // mark as error if somehow missing
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { status: "ERROR", errorMessage: "Attempt not found", finishedAt: new Date() },
      });
      await queue.delete(msg);
      return;
    }

    const tests = await prisma.testCase.findMany({
      where: { problemId: attempt.problemId },
      orderBy: [{ hidden: "asc" }, { ordinal: "asc" }],
      select: { input: true, expected: true },
    });

    if (tests.length === 0) {
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { status: "ERROR", errorMessage: "No tests found", finishedAt: new Date() },
      });
      await queue.delete(msg);
      return;
    }

    // Run via Runner
    const result = await runner.runAttempt({
      attemptId: attempt.id,
      language: attempt.language as any,
      code: attempt.code,
      tests: tests as unknown as TestCase[],
      perTestMs: PER_TEST_MS,
    });

    const status = result.passed === result.total ? "PASSED" : "FAILED";

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status,
        passedCount: result.passed,
        totalCount: result.total,
        runtimeMs: result.runtimeMs,
        finishedAt: new Date(),
        logs: (result.logs || []).join("\n").slice(0, 20000),
        errorMessage: null,
      },
    });

    await queue.delete(msg);
  } catch (err: any) {
    const message = String(err?.message || err).slice(0, 2000);
    try {
      await prisma.attempt.update({
        where: { id: attemptId },
        data: { status: "ERROR", errorMessage: message, finishedAt: new Date() },
      });
    } catch {}
    await queue.fail(msg, message);
  }
}

async function main() {
  console.log(`[worker] starting with concurrency=${MAX_CONCURRENCY}`);
  const slots: Promise<void>[] = [];
  for (let i = 0; i < MAX_CONCURRENCY; i++) {
    slots.push((async function loop() {
      while (true) {
        await processOne();
      }
    })());
  }
  await Promise.all(slots);
}

main().catch((e) => {
  console.error("[worker] fatal:", e);
  process.exit(1);
});
