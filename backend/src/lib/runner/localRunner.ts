import type { Runner, RunAttemptInput, RunAttemptResult } from "./types";

export class LocalRunner implements Runner {
  async runAttempt(input: RunAttemptInput): Promise<RunAttemptResult> {
    const { attemptId, language, code, tests, perTestMs = 2000 } = input;

    // Lazy import to avoid top-level require during server cold start
    const { runAllTests } = await import("../sandbox");

    const started = Date.now();
    const { passed, total, logs } = await runAllTests(code, language, tests as any[], perTestMs);
    const runtimeMs = Date.now() - started;

    // You can push a line that tags the attempt for easier debugging
    logs.unshift(`[attempt ${attemptId}] ran ${total} tests in ${runtimeMs}ms`);

    return { passed, total, logs, runtimeMs };
  }
}
