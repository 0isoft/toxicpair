// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.problem.count();
  if (count > 0) {
    console.log("Problems already seeded.");
    return;
  }

  await prisma.problem.createMany({
    data: [
      {
        title: "Two Sum",
        description:
          "Given an array nums and an integer target, return indices of the two numbers such that they add up to target.",
        difficulty: "Easy",
        examples: { input: "nums=[2,7,11,15], target=9", output: "[0,1]" },
        tests: [
          { input: "nums=[2,7,11,15], target=9", output: "[0,1]" },
          { input: "nums=[3,2,4], target=6", output: "[1,2]" },
        ],
      },
      {
        title: "Reverse String",
        description: "Write a function that reverses a string.",
        difficulty: "Easy",
        examples: { input: "s='hello'", output: "'olleh'" },
        tests: [
          { input: "s='hello'", output: "'olleh'" },
          { input: "s='racecar'", output: "'racecar'" },
        ],
      },
      {
        title: "Valid Parentheses",
        description:
          "Given a string s containing just '()[]{}', determine if the input string is valid.",
        difficulty: "Easy",
        examples: { input: "s='()[]{}'", output: "true" },
        tests: [
          { input: "s='()[]{}'", output: "true" },
          { input: "s='(]'", output: "false" },
        ],
      },
      {
        title: "Merge Two Sorted Lists",
        description:
          "Merge two sorted linked lists and return it as a new sorted list.",
        difficulty: "Easy",
        examples: { input: "l1=[1,2,4], l2=[1,3,4]", output: "[1,1,2,3,4,4]" },
        tests: [
          { input: "l1=[1,2,4], l2=[1,3,4]", output: "[1,1,2,3,4,4]" },
        ],
      },
      {
        title: "Maximum Subarray",
        description: "Find the contiguous subarray with the largest sum.",
        difficulty: "Medium",
        examples: {
          input: "nums=[-2,1,-3,4,-1,2,1,-5,4]",
          output: "6",
        },
        tests: [
          {
            input: "nums=[-2,1,-3,4,-1,2,1,-5,4]",
            output: "6",
          },
        ],
      },
    ],
  });

  console.log("Seeded 5 problems.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
