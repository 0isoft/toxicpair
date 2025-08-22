export type Problem = {
    id: number;
    title: string;
    difficulty: string;
    description?: string | null;
    examples?: Record<string, unknown> | null;
  };
  export type User = { id: number; email: string; createdAt: string };
  
  export type Attempt = {
    id: number;
    problemId: number;
    status: "SUBMITTED" | "PASSED" | "FAILED" | "ERROR";
    passedCount: number;
    totalCount: number;
    runtimeMs: number | null;
    submittedAt: string; // ISO
    language: string;
  };
  
  export type AttemptDetail = Attempt & {
    code: string;
  };

  export type AttemptSummary = {
    problemId: number;
    status: "SUBMITTED" | "PASSED" | "FAILED" | "ERROR";
    submittedAt: string;
    problem: { id: number; title: string; difficulty: string };
  };
  