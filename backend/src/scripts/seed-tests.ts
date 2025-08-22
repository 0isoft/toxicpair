import { prisma } from "../lib/prisma";

type T = { input: any[]; expected: any; hidden?: boolean };
console.log("Seeding DB:", (process.env.DATABASE_URL || "").replace(/:[^:@/]+@/, ":[redacted]@"));

async function setTestsByTitle(title: string, tests: T[]) {
  const problem = await prisma.problem.findFirst({ where: { title } });
  if (!problem) {
    console.warn(`Problem not found: "${title}" — skipping`);
    return;
  }
  // Clear old tests so we don't duplicate
  await prisma.testCase.deleteMany({ where: { problemId: problem.id } });

  await prisma.testCase.createMany({
    data: tests.map((t, i) => ({
      problemId: problem.id,
      input: t.input,
      expected: t.expected,
      hidden: t.hidden ?? (i > 0), // first is visible by default
      ordinal: i,
    })),
  });

  console.log(`Seeded ${tests.length} tests for "${title}" (id=${problem.id})`);
}

async function main() {
  // Two Sum: solution(nums, target) -> [i, j]
  await setTestsByTitle("Two Sum", [
    { input: [[2,7,11,15], 9], expected: [0,1], hidden: false },
    { input: [[3,2,4], 6],     expected: [1,2] },
    { input: [[3,3], 6],       expected: [0,1] },
  ]);

  // Reverse String: solution(s) -> reversed string
  await setTestsByTitle("Reverse String", [
    { input: ["hello"],   expected: "olleh", hidden: false },
    { input: [""],        expected: "" },
    { input: ["racecar"], expected: "racecar" },
    { input: ["abc"],     expected: "cba" },
  ]);

  // Valid Parentheses: solution(s) -> boolean
  await setTestsByTitle("Valid Parentheses", [
    { input: ["()"],       expected: true,  hidden: false },
    { input: ["()[]{}"],   expected: true  },
    { input: ["(]"],       expected: false },
    { input: ["([)]"],     expected: false },
    { input: ["{[]}"],     expected: true  },
  ]);

  // Merge Two Sorted Lists (use arrays): solution(a, b) -> merged array
  await setTestsByTitle("Merge Two Sorted Lists", [
    { input: [[1,2,4],[1,3,4]], expected: [1,1,2,3,4,4], hidden: false },
    { input: [[],[]],           expected: [] },
    { input: [[],[0]],          expected: [0] },
    { input: [[1,1,2],[1,3,4]], expected: [1,1,1,2,3,4] },
  ]);

  // Maximum Subarray: solution(nums) -> max sum
  await setTestsByTitle("Maximum Subarray", [
    { input: [[-2,1,-3,4,-1,2,1,-5,4]], expected: 6,  hidden: false },
    { input: [[1]],                     expected: 1  },
    { input: [[5,4,-1,7,8]],           expected: 23 },
    { input: [[-1,-2,-3]],             expected: -1 },
  ]);
}

main()
  .then(() => console.log("✅ Done seeding tests"))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
