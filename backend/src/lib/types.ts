//this all for sandbox to run on AWS instances

export type Language = "javascript" | "js" | "python" | "cpp";

export type TestCase = {
  input: unknown[];   // arguments array
  expected: unknown;  // expected return value
};

export type AttemptJob = {
  attemptId: number;
  language: Language;
};
