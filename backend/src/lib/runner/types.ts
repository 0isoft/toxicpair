import type { Language, TestCase } from "../types";

export type RunAttemptInput = {
  attemptId: number;       // for logging/metrics (not strictly needed)
  language: Language;
  code: string;
  tests: TestCase[];
  perTestMs?: number;      // default 2000
};

export type RunAttemptResult = {
  passed: number;
  total: number;
  logs: string[];
  runtimeMs: number;
};

export interface Runner {
  runAttempt(input: RunAttemptInput): Promise<RunAttemptResult>;
}
