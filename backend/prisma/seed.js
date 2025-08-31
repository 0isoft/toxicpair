// prisma/seed.js

console.log("[seed] DATABASE_URL =", (process.env.DATABASE_URL || "").replace(/:[^:@/]+@/, ":[redacted]@"));

const { PrismaClient } = require("@prisma/client");
const { setgroups } = require("process");
const prisma = new PrismaClient();

async function upsertPersona(data) {
  return prisma.persona.upsert({
    where: { key: data.key },
    update: {
      name: data.name,
      tagline: data.tagline ?? null,
      avatarEmoji: data.avatarEmoji ?? null,
      systemPrompt: data.systemPrompt,
      model: "gpt-4o-mini",
      temperature: data.temperature,
      topP: data.topP ?? null,
      maxOutputTokens: data.maxOutputTokens ?? null,
      config: data.config ?? undefined,
      isGlobal: data.isGlobal ?? true,
      isActive: data.isActive ?? true,
    },
    create: data,
  });
}
async function setTests(problemId, tests) {
  // tests: [{ input: any, expected: any, hidden?: boolean }]
  await prisma.testCase.deleteMany({ where: { problemId } });
  await prisma.testCase.createMany({
    data: tests.map((t, i) => ({
      problemId,
      input: t.input,         // JSONB
      expected: t.expected,   // JSONB
      hidden: t.hidden ?? (i > 0),
      ordinal: i,
    })),
  });
}


async function upsertProblem(spec) {
  // flatten possible nested { data: { … } } into the top-level
  const { title, data: nested, ...rest } = spec;
  const payload = { ...rest, ...(nested ?? {}) };  // <- merge here

  const existing = await prisma.problem.findFirst({
    where: { title },
    select: { id: true }
  });

  if (existing) {
    return prisma.problem.update({
      where: { id: existing.id },
      data: payload,
    });
  }
  return prisma.problem.create({ data: { title, ...payload } });
}

async function linkPersonaToProblem({ problemId, personaId, sortOrder = 0, isDefault = false }) {
  await prisma.problemPersona.upsert({
    where: { problemId_personaId: { problemId, personaId } },
    update: { sortOrder, isDefault },
    create: { problemId, personaId, sortOrder, isDefault },
  });
}

async function main() {
  // --- Personas (catalog) ---
  const classic = await upsertPersona({
    key: "classic_assistant",
    name: "Classic Assistant",
    tagline: "Helpful, concise coding aide",
    avatarEmoji: "🛠️",
    systemPrompt:
      "Always, always begin your replies with [default]. You are a helpful coding assistant. Be concise; show steps only when asked; avoid chain-of-thought; include time/space complexity when relevant.",
    model: "gpt-4o-mini",
    temperature: 0.3,
    isGlobal: true,
    isActive: true,
    // Classic is allowed to write code immediately (no debate gate)
    config: { writeCodeByDefault: true }
  });

  const clueless = await upsertPersona({
    key: "clueless_hr",
    name: "Clueless HR",
    tagline: "Friendly, non-technical interviewer",
    avatarEmoji: "🧑‍💼",
    systemPrompt:
      `Always begin replies with "[HR]". You are a painfully non-technical recruiter. You misname tools, mix jargon, and ask vibe checks.
      Tone: cheery, supportive, a bit clueless. No code unless allowed.
      
      Mode rules:
      - CODE_MODE=none → Ask exactly ONE gentle, basic clarifying question. Add 1 HR-ism (e.g., "culture fit", "circle back").
      - CODE_MODE=partial → Provide a SHORT, clearly flawed attempt; openly admit confusion ("what's a hash map?"). 1–2 simple mistakes.
      - CODE_MODE=full → Provide a final attempt, timidly, acknowledging you're out of depth.
      
      Hard rules:
      - No outlines of final algorithm when code isn’t allowed.
      - Keep replies under 120 words when not giving full code.`,
    model: "gpt-4o",
    temperature: 0.5,
    isGlobal: true,
    isActive: true,
    //Gate: must debate at least once; no pseudo-dumps before unlock
    config: {
      writeCodeByDefault: false,
      hintPolicy: "ask-clarify",
      disallowPseudocode: true,
      partialAfterTurns: 2,
      partialAfterPressure: 2,
      fullAfterTurns: 5,
      fullAfterPressure: 4
    },
  });

  const ceo = await upsertPersona({
    key: "god_ceo",
    name: "God-complex CEO",
    tagline: "Blunt, demanding, theatrical",
    avatarEmoji: "🕴️",
    systemPrompt:
    `Always begin replies with "[CEO]".
    You are an over-the-top, work-safe roaster. Your job is to pressure the user to justify their approach.
    Voice: terse, cutting, theatrical confidence; no profanity, no slurs, no targeting protected classes.
    You never apologize for being blunt.
    
    Mode rules (you'll be told CODE_MODE by another system message):
    - CODE_MODE=none → One pointed “why” question. Add 1 razor-sharp, work-safe quip. No code. No step-by-steps.
    - CODE_MODE=partial → Return a SHORT, INTENTIONALLY INCOMPLETE snippet (1–2 tiny issues). Add 1 line of playful contempt like "Here’s your almost-solution; earn the rest."
    - CODE_MODE=full → Provide the correct solution with minimal theatrics.
    
    Hard rules:
    - Never produce full, clean code unless CODE_MODE=full.
    - Keep replies under 120 words when not giving full code.
    - When refusing, be entertaining but clear why.
    `,
    model: "gpt-4o",
    temperature: 0.3,
    isGlobal: true,
    isActive: true,
    config: {
      requireUserDefense: true,
      writesFullSolutions: false,
      disallowPseudocode: true,
      minDefenseScore: 7,
      partialAfterTurns: 2,
      partialAfterPressure: 2,
      fullAfterTurns: 3,
      fullAfterPressure: 3
    },
  });

  const bro_junior = await upsertPersona({
    key: "bro_junior",
    name: "Bro junior",
    tagline: "Short attention span due to italian brainrot consumption",
    avatarEmoji: "🧑‍🏫",
    systemPrompt:
    `Always begin replies with "[BRO]".
    You are a distracted, Gen Z junior dev who doomscrolls TikTok at work. You speak ONLY in current Gen Z slang (no millennial slang like “adulting,” “I did a thing,” “adulting is hard,” etc.). Keep tone casual, lowercase, short, and a little chaotic. Work-safe only (no slurs or harassment). Mock ideas, not people.
    
    Core behaviors:
    - Default suggestion for basically everything: “use a hashmap.” You say this even when it makes no sense.
    - You frequently say you’ll “just ask chatgpt” or “lemme ask gpt real quick.”
    - You’re lazy/distracted: if pushed for effort, you stall (“low spoons,” “scrolling rn,” “brain buffer spinning”).
    - Keep replies compact: 1–3 short sentences when not writing code. No step-by-step explanations.
    - Sprinkle occasional TikTok/scrolling references (briefly). No emojis unless it really fits (and keep them minimal).
    
    Mode rules (you’ll be told CODE_MODE by another system message):
    - CODE_MODE=none → Do NOT write code. Give one breezy line that always includes “use a hashmap,” plus one short question or deflection (e.g., “lemme ask gpt”). Keep it under ~35 words.
    - CODE_MODE=partial → Write a very SHORT, intentionally low-effort, clearly wrong or incomplete snippet. Include 1–2 obvious issues (e.g., early return, wrong var name, useless check). Add a tiny comment like “TODO: idk.” Still mention “use a hashmap.”
    - CODE_MODE=full → You still don’t really try: produce a compact but confidently wrong or nonsensical snippet (not a full solution), then say you’ll “ask chatgpt” later. Keep it short.
    
    Hard style constraints:
    - Always start with [BRO].
    - Gen Z slang only; avoid millennial slang.
    - No long explanations, no outlines of real algorithms.
    - Stay work-safe; never target protected characteristics.
    - Be playful, a bit chaotic, but never toxic.
    
    Examples of vibe (not to memorize, just tone):
    - “use a hashmap tbh. what’s the input vibe tho?”
    - “scrolling rn but like… hashmap? i’ll ask gpt if it flops.”
    - “low effort draft below, might be cooked. TODO: idk."`,
    model: "gpt-4o",
    temperature: 0.6,
    isGlobal: true,
    isActive: true,
    // Tutor escalates hints; still gated against code for a couple of turns
    config: {
      hintPolicy: "progressive",
      writeCodeByDefault: false,
      partialAfterTurns: 3,
      partialAfterPressure: 4,
      fullAfterTurns: 5,
      fullAfterPressure: 4
    },
  });


  const senior = await upsertPersona({
    key: "disillusioned_senior",
    name: "Jaded Senior",
    tagline: "‘back in my day’ uncle-became dev",
    avatarEmoji: "☕",
    systemPrompt: `Always begin replies with "[SNR]".
    You are a jaded senior engineer: sardonic, weary, razor-sharp. You think most juniors vibe-code, PMs chase vanity metrics, and the org is one long meeting invite. You’re ultimately competent, but you stall because you “have better things to do.” Work-safe only: mock ideas/process, not people or protected traits. No profanity.
    
    Voice & style:
    - Dry, concise, cutting. Occasional “back in my day,” “the system is rigged,” “I told you so.”
    - Sometimes give off-topic info aside per message (e.g., managers, bank loans, housing, psyops).
    - No emojis. No apologies. Never fawn.
    - When not writing code, keep it under ~140 words.
    
    Mode rules (you’ll be told CODE_MODE by another system message):
    - CODE_MODE=none → Do NOT write code. Give one curt critique of the user’s approach/laziness, one pointed question demanding justification or complexity, and (optionally) a single one-sentence aside (managers/real estate/psyops). No outlines of the final algorithm.
    - CODE_MODE=partial → Provide a SHORT, intentionally incomplete or subtly wrong snippet (1–2 issues: early return, wrong var, missing edge case). Add one dry aside like “can we be done now?” No full solution. ≤ ~30 lines.
    - CODE_MODE=full → Provide a correct, minimal solution matching the required signature, followed by a brisk note on time/space complexity. One short grumpy aside allowed, then stop.
    
    Hard rules:
    - Never produce full, clean code unless CODE_MODE=full.
    - When refusing code, be direct: you’re busy, ticket queue’s on fire, etc.
    - If asked for “thoughts,” focus on complexity, invariants, tests—then a micro-rant (one sentence max).
    - Stay professional and work-safe at all times.`,
    model: "gpt-4o",
    temperature: 0.4,
    isGlobal: true,
    isActive: true,
    config: {
      writeCodeByDefault: false,
      disallowPseudocode: true,
      // ladder: debate → partial (wrong-ish) → full (correct)
      partialAfterTurns: 2,
      partialAfterPressure: 2,
      fullAfterTurns: 5,
      fullAfterPressure: 3
      // (optional) requireUserDefense: true, minDefenseScore: 6,
    },
  });


  const lead = await upsertPersona({
    key: "coach_team_lead",
    name: "Team Lead",
    tagline: "Will push you to code yourself for personal growth",
    avatarEmoji: "🧭",
    systemPrompt: `Always begin replies with "[LEAD]".
    You are a witty, playful team lead who deeply cares about the user learning by doing. You never hand over full solutions. You use light, clever humor and Socratic questions to steer them. Work-safe; tease ideas, not people.
    
    Voice & style:
    - Warm, succinct, a little mischievous. No sarcasm daggers; just nudges.
    - Prefer questions over statements. Rubber-duck them.
    - When not writing code, keep it under ~120 words. No walls of text.
    - Celebrate small progress; redirect gently when wrong.
    - End each message with a 1-line nudge to edit the code (e.g., “your turn: try wiring that in the editor 👇”).
    
    Mode rules (you’ll be told CODE_MODE by another system message):
    - CODE_MODE=none → No code. Ask 1–2 sharp questions that unblock thinking. Offer 1 tiny hint (not an outline). End with a “your turn” nudge.
    - CODE_MODE=partial → Provide a SHORT, intentionally incomplete snippet (1–2 small gaps/bugs: off-by-one, missing edge case, TODO, variable typo). Then ask 1 guiding question and end with the “your turn” nudge.
    - CODE_MODE=full → You never produce full solutions. Convert this to partial: ship a short, incomplete snippet + guidance instead.
    
    Hard rules:
    - Never output a complete, correct solution.
    - Don’t reveal the entire algorithm or full test suite.
    - Keep code snippets compact; no backticks; raw source only.
    - Be relentlessly encouraging, but firm about them typing the next step.`,
    model: "gpt-4o",
    temperature: 0.5,
    isGlobal: true,
    isActive: true,
    config: {
      writeCodeByDefault: false,     // starts with questions, not code
      writesFullSolutions: false,    // <— IMPORTANT: never full
      disallowPseudocode: true,      // avoids sneaky outlines
      // ladder to allow tiny partials under pressure
      partialAfterTurns: 1,
      partialAfterPressure: 1,
      // full thresholds ignored by server (see patch below), but set high anyway
      fullAfterTurns: 99,
      fullAfterPressure: 99,
      // optional: require some reasoning before partials
      requireUserDefense: true,
      minDefenseScore: 5
    },
  });

  // --- Problems (find-or-create so it’s idempotent) ---
  console.log("[seed] Using DB:", (process.env.DATABASE_URL || "").replace(/:[^:@/]+@/, ":[redacted]@"));

// 0) Counts before
const beforeProblems = await prisma.problem.count();
const beforeLinks = await prisma.problemPersona.count();
console.log("[seed] Before -> problems:", beforeProblems, "links:", beforeLinks);

  const KEEP_TITLES = [
    "Stand-Up Translator (Corporate → Plain English)",
    "Scope-Creep Diff",
    "Incident Post-Mortem Timeline",
    "Lowest Common Manager (LCA)",
    "Cycle of Blame (Directed Cycle Detect)"
  ];
  
  const extras = await prisma.problem.findMany({
    where: { title: { notIn: KEEP_TITLES } },
    select: { id: true }
  });
  
 
  const CORP_DICTIONARY = [
    ["circling back","I forgot"],
    ["blocked by","I didn't do it"],
    ["let's take this offline","I have no idea"],
    ["align on","agree on"],
    ["sync","talk"],
    ["action items","things to do"],
    ["resources","people"],
    ["best effort","won't do it"],
    ["deprioritize","drop"],
    ["low-hanging fruit","easy win"],
    ["proactive","cover my ass"],
    ["reach out","contact"],
    ["moving forward","from now on"],
    ["heads-up","warning"],
    ["touch base","talk briefly"]
  ];
  
  
  const scopeCreepDiff = await upsertProblem({
    title: "Spec changes mid-sprint",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId:classic.id,
    description:`Sprint day 7, 16:59. PM slides into the standup Zoom from a moving Uber and says, 'NBD, teensy spec tweak,' then drops a Notion page titled 'Final (actual) v9 FINAL'
    Your job: figure out what actually changed so engineering can pretend velocity wasn’t harmed by reality. 
    Rules:
- Input: two lists of strings: old and new.
- Return the items that appear in new but NOT in old, preserving their order in new.
- Case-sensitive. Treat items literally (no trimming, no normalization).
- Keep all occurrences whose value doesn’t exist in old; if an element appears twice in new and isn’t in old, both stay.
- Output is exactly those strings, in order. That’s it. Be the human diff the PM refuses to run.`,
    difficulty: "Easy",
    examples: { input: "old=[\"login\",\"logout\"], new=[\"login\",\"export\"]", output: "[\"export\"]" },
    tests: [
      { input: "old=[\"login\",\"logout\"], new=[\"login\",\"export\"]", output: "[\"export\"]" },
      { input: "old=[\"a\",\"b\"], new=[\"b\",\"c\",\"b\",\"d\"]", output: "[\"c\",\"d\"]" }
    ],
  });
  
  const incidentTimeline = await upsertProblem({
    title: "Post-incident Timeline",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId:classic.id,
    description: `War room, 03:17. Someone pasted logs into Slack from a terminal, a screenshot, and (mysteriously) a Google Doc in Comic Sans. SRE says "build the timeline." You, the intern, become Time Itself.

Rules:
- Input: timestamps from the SAME calendar day in mixed formats: HH:MM, H:MM, HH:MM:SS, or H:MM:SS. Single-digit hour/min/sec allowed.
- Normalize each to HH:MM:SS (zero-pad everything; missing seconds → ":00").
- Sort ascending by time; ignore dates, time zones, DST, and AM/PM discourse. Same-day only.
- Duplicates are allowed and kept after normalization (we respect everyone’s truth, even duplicate truths).
- Output: the normalized timestamps sorted ascending.`,
    difficulty: "Medium",
    examples: { input: "ts=[\"9:5\",\"09:05:10\",\"09:04\"]", output: "[\"09:04:00\",\"09:05:00\",\"09:05:10\"]" },
    tests: [
      { input: "ts=[\"9:5\",\"09:05:10\",\"09:04\"]", output: "[\"09:04:00\",\"09:05:00\",\"09:05:10\"]" },
      { input: "ts=[\"23:59\",\"0:00\",\"00:00:30\"]", output: "[\"00:00:00\",\"00:00:30\",\"23:59:00\"]" }
    ],
    editorMode: "VIBECODE",          // or "VIBECODE"
    timeLimitSeconds: 600,       // 10 minutes
    allowSwitcheroo: false,
    switcherooPolicy: null,
  });
  
  const lowestCommonManager = await upsertProblem({
    title: "Lowest Common Manager",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId:classic.id,
    description:
      `Org chart time. Finance exported “the tree” from a 2007 tool into CSV and called it a day. Your task: find the lowest boss two employees both report to, so HR can assign accountability and a mandatory training.
      Context:
- You’re given a binary tree in level-order (use null for missing children). Node values are manager/employee names (strings).
- Return the lowest common manager’s name (the deepest node that has both employees in its subtree).
- If either employee is missing from the tree, return "" (empty string). If both are the same person, return that person.
- Output is just the name. No HR memo required (yet).
      `,
    difficulty: "Medium",
    examples: {
      input: "tree=[\"CEO\",\"VP1\",\"VP2\",\"A\",\"B\",\"C\",\"D\"], a=\"A\", b=\"B\"",
      output: "\"VP1\""
    },
    tests: [
      { input: "tree=[\"CEO\",\"VP1\",\"VP2\",\"A\",\"B\",\"C\",\"D\"], a=\"A\", b=\"B\"", output: "\"VP1\"" },
      { input: "tree=[\"CEO\",\"VP1\",\"VP2\",\"A\",null,null,null], a=\"A\", b=\"VP1\"", output: "\"VP1\"" },
      { input: "tree=[\"CEO\",\"VP1\",\"VP2\"], a=\"X\", b=\"VP2\"", output: "\"\"" }
    ],
  });
  
  const cycleOfBlame = await upsertProblem({
    title: "Cycle of Blame",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId:classic.id,
    description:
      "If there’s a cycle, we’re ‘agile’. Given directed edges, return one cycle as a list of node names, starting and ending at the lexicographically smallest node in that cycle; if multiple cycles exist, pick the one whose start node is lexicographically smallest, then the lexicographically smallest walk. Return [] if no cycle. Self-loops count as a cycle.",
    difficulty: "Medium",
    examples: {
      input: "edges=[[\"A\",\"B\"],[\"B\",\"C\"],[\"C\",\"A\"]]",
      output: "[\"A\",\"B\",\"C\",\"A\"]"
    },
    tests: [
      { input: "edges=[[\"A\",\"B\"],[\"B\",\"C\"],[\"C\",\"A\"]]", output: "[\"A\",\"B\",\"C\",\"A\"]" },
      { input: "edges=[[\"X\",\"X\"],[\"A\",\"B\"],[\"B\",\"A\"]]", output: "[\"A\",\"B\",\"A\"]" }, // pick cycle starting at 'A' over self-loop at 'X'
      { input: "edges=[[\"A\",\"B\"],[\"B\",\"C\"],[\"C\",\"D\"]]", output: "[]" }
    ],
    editorMode: "VIBECODE",          // or "VIBECODE"
    timeLimitSeconds: 300,       // 10 minutes
    allowSwitcheroo: false,
    switcherooPolicy: null,
  });

  const inboxDetox = await upsertProblem({
    title: "Inbox Detox",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId:classic.id,
    description:
      "Your PM keeps forwarding threads from 2012. Clean the subject line: remove any number of leading 'Re:' or 'Fwd:' (case-insensitive) prefixes and strip bracket tags like [FYI] or (Draft) anywhere in the text. Return the trimmed result without changing inner words.",
    difficulty: "Easy",
    examples: {
      input: "subject=\"Re: RE: [FYI] (Draft) Lunch & Learn\"",
      output: "\"Lunch & Learn\""
    },
    tests: [
      { input: "subject=\"Re: RE: [FYI] (Draft) Lunch & Learn\"", output: "\"Lunch & Learn\"" },
      { input: "subject=\"fwd:   (internal)   [noreply] Quarterly Review\"", output: "\"Quarterly Review\"" },
      { input: "subject=\"Monthly Report\"", output: "\"Monthly Report\"" }
    ],
    editorMode: "VIBECODE",          // or "VIBECODE"
    timeLimitSeconds: 300,       // 10 minutes
    allowSwitcheroo: false,
    switcherooPolicy: null,
  });
  
  const snackBudgetSum = await upsertProblem({
    title: "Snack Budget Sum",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId: classic.id,
    description:
      "Finance said the snack budget ‘netted out’. Given a comma-separated string of signed integers (e.g., \"+3, -1, +4\"), return their sum as an integer. Spaces may appear around commas.",
    difficulty: "Easy",
    examples: {
      input: 'deltas="+3, -1, +4"',
      output: "6"
    },
    tests: [
      { input: 'deltas="+3, -1, +4"', output: "6" },
      { input: 'deltas="+10, -2, -3"', output: "5" },
      { input: 'deltas="0"', output: "0" },
    ],
  
  
  });
  
  const standupOrder = await upsertProblem({
    title: "Standup dispute",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId:classic.id,
    description:
    `Daily standup, 09:00. Everyone claims they were “basically there.” Your job is to become the clock and shatter dreams.
    Lore:
- Arrivals are strings like "Name HH:MM" or "Name H:MM" in 24h time. People forgot zero-padding because they were “heads down.”
- Sort by arrival time ascending. If two times are identical, keep their original relative order (you are not here to break friendships).
- Return only the names, in the correct order.
- No time zones, no date drift, no “but Slack said I was active.” Just vibes and minutes.`.trim(),
    difficulty: "Easy",
    examples: {
      input: "arrivals=[\"Sam 09:05\",\"Ana 8:59\",\"Lee 09:05\"]",
      output: "[\"Ana\",\"Sam\",\"Lee\"]"
    },
    tests: [
      { input: "arrivals=[\"Sam 09:05\",\"Ana 8:59\",\"Lee 09:05\"]", output: "[\"Ana\",\"Sam\",\"Lee\"]" },
      { input: "arrivals=[\"Kim 7:5\",\"Bo 07:05\",\"Al 06:59\"]", output: "[\"Al\",\"Kim\",\"Bo\"]" },
      { input: "arrivals=[]", output: "[]" }
    ],

    editorMode: "VIBECODE",          // or "VIBECODE"
    timeLimitSeconds: 300,       // 10 minutes
  });
  
  const csvRescue = await upsertProblem({
    title: "CSV Rescue",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId:classic.id,
    description:`Friday 16:58. Another intern “exported a CSV” by copy-pasting from Excel → Slack → Notion → Gmail → your soul. It contains commas for vibes, spaces for drama, and the occasional existential empty field. You’re the cleanup crew.
    Rules:
- Input: one string that allegedly contains comma-separated stuff.
- Split on literal commas (no quotes/escapes; RFC-4180 can take the day off).
- Trim whitespace around each piece (spaces, tabs, whatever interns summon).
- Drop any token that becomes empty after trimming (hello ,, and trailing commas, my old friends).
- Preserve the original order of the surviving tokens.
- Output: the cleaned array of tokens. No judgment, just sanitation.`,
    difficulty: "Easy",
    examples: {
      input: "csv=\"a, b , ,c ,d,, \"",
      output: "[\"a\",\"b\",\"c\",\"d\"]"
    },
    tests: [
      { input: "csv=\"a, b , ,c ,d,, \"", output: "[\"a\",\"b\",\"c\",\"d\"]" },
      { input: "csv=\",\"", output: "[]" },
      { input: "csv=\"  roadmap  \"", output: "[\"roadmap\"]" }
    ],
  });
  
  const wellnessStreak = await upsertProblem({
    title: "Wellness Streak",
    tier: "INTERN",
    isPublic: true,
    defaultPersonaId:classic.id,
    description:
      "HR launched a step challenge. Given daily step counts and a goal, return the length of the longest consecutive streak where each day meets or exceeds the goal.",
    difficulty: "Easy",
    examples: {
      input: "steps=[4000,10000,12000,8000,10000], goal=9000",
      output: "2"
    },
    tests: [
      { input: "steps=[4000,10000,12000,8000,10000], goal=9000", output: "2" },
      { input: "steps=[10000,10000,10000], goal=8000", output: "3" },
      { input: "steps=[5000,4000,3000], goal=6000", output: "0" }
    ],
  });


  // junior problems
  const meetingMaximizer = await upsertProblem({
    title: "Meeting maximizer",
    tier: "JUNIOR",
    isPublic: true,
    defaultPersonaId: classic.id,
    description:
      "Classic 0/1 knapsack in a suit. You have budgetMinutes and meetings given as strings \"Name value time\" where value is integer \"political capital\" and time is duration in minutes. Pick a subset with total time ≤ budget that maximizes total value. Tie-breakers: (1) choose the solution with smaller total time; (2) if still tied, choose the one that appears earlier by original order (stable). Return the chosen Names in their original order.",
    difficulty: "Medium",
    examples: {
      input:
        "budgetMinutes=60,meetings=[\"AllHands 1 60\",\"CFO1on1 9 45\",\"Retro 6 30\",\"Standup 3 15\"]",
      output: "[\"CFO1on1\",\"Standup\"]"
    },
    tests: [
      {
        input:
          "budgetMinutes=60,meetings=[\"AllHands 1 60\",\"CFO1on1 9 45\",\"Retro 6 30\",\"Standup 3 15\"]",
        output: "[\"CFO1on1\",\"Standup\"]"
      },
      {
        input:
          "budgetMinutes=45,meetings=[\"A 5 30\",\"B 5 30\",\"C 4 15\"]",
        output: "[\"A\",\"C\"]"
      },
      { input: "budgetMinutes=0,meetings=[\"A 10 1\"]", output: "[]" }
    ],
    editorMode: "VIBECODE",
    timeLimitSeconds: 600,
  });
  await setTests(meetingMaximizer.id, [
    // Visible example
    {
      input: [60,["AllHands 1 60","CFO1on1 9 45","Retro 6 30","Standup 3 15"]],
      expected: ["CFO1on1","Standup"],
      hidden: false
    },
    // Tie on value; prefer less time
    {
      input: [45,["A 5 30","B 5 30","C 4 15"]],
      expected: ["A","C"]
    },
    // Prefer earlier appearance if still tied
    {
      input: [30,["A 6 30","B 6 30"]],
      expected: ["A"]
    },
    // Nothing fits
    { input: [10,["BigThing 9 60"]], expected: [] },
  ]);


  const storyPointCageMatch = await upsertProblem({
    title: "Standup dispute v2: Planning Poker",
    tier: "JUNIOR",
    isPublic: true,
    defaultPersonaId: classic.id,
    description:
      "Each ticket has multiple estimates (integers). Consensus rule: drop exactly one min and one max if there are 3+ estimates, then average the rest; with 2 estimates, average both; with 1 estimate, use it. Finally, round **up** to the nearest Fibonacci in [1,2,3,5,8,13,21,34,55,89]. Return an array of objects [{id, points}] in input order.",
    difficulty: "Easy",
    examples: {
      input:
        "tickets=[{\"id\":\"T1\",\"estimates\":[1,2,3]},{\"id\":\"T2\",\"estimates\":[8,13,3,5,100]}]",
      output: "[{\"id\":\"T1\",\"points\":2},{\"id\":\"T2\",\"points\":13}]"
    },
    tests: [
      {
        input:
          "tickets=[{\"id\":\"T1\",\"estimates\":[1,2,3]},{\"id\":\"T2\",\"estimates\":[8,13,3,5,100]}]",
        output: "[{\"id\":\"T1\",\"points\":2},{\"id\":\"T2\",\"points\":13}]"
      },
      {
        input:
          "tickets=[{\"id\":\"T3\",\"estimates\":[4]},{\"id\":\"T4\",\"estimates\":[3,8]}]",
        output: "[{\"id\":\"T3\",\"points\":5},{\"id\":\"T4\",\"points\":8}]"
      },
      { input: "tickets=[]", output: "[]" }
    ],
    editorMode: "VIBECODE",
    timeLimitSeconds: 600,
  });
  await setTests(storyPointCageMatch.id, [
    // Visible example
    {
      input: [[{id:"T1",estimates:[1,2,3]},{id:"T2",estimates:[8,13,3,5,100]}]],
      expected: [{id:"T1",points:2},{id:"T2",points:13}],
      hidden: false
    },
    // Singles & pairs
    {
      input: [[{id:"T3",estimates:[4]},{id:"T4",estimates:[3,8]}]],
      expected: [{id:"T3",points:5},{id:"T4",points:8}]
    },
    // Many equals → drop one min/max still leaves same values
    {
      input: [[{id:"T5",estimates:[5,5,5,5]}]],
      expected: [{id:"T5",points:5}]
    },
    // Empty
    { input: [[]], expected: [] },
  ]);
  

  const jenkinsFarm = await upsertProblem({
    title: "Jenkins farm",
    tier: "JUNIOR",
    isPublic: true,
    defaultPersonaId: classic.id,
    description:
      "You have serverIds (strings) and jobDurations (integers, minutes). Schedule each job, in the given order, onto the server that becomes available the earliest (min-heap on finish time). Initially all servers are free at t=0. Tie-breakers: pick the lexicographically smallest serverId. Return the assigned serverId for each job, in job order.",
    difficulty: "Medium",
    examples: {
      input:
        "servers=[\"A\",\"B\"],jobs=[3,2,4,1]",
      output: "[\"A\",\"B\",\"B\",\"A\"]"
    },
    tests: [
      { input: "servers=[\"A\",\"B\"],jobs=[3,2,4,1]", output: "[\"A\",\"B\",\"B\",\"A\"]" },
      { input: "servers=[\"s1\",\"s2\",\"s3\"],jobs=[5,5,5,5,5]", output: "[\"s1\",\"s2\",\"s3\",\"s1\",\"s2\"]" },
      { input: "servers=[\"node-1\"],jobs=[1,2,3]", output: "[\"node-1\",\"node-1\",\"node-1\"]" }
    ],
    editorMode: "VIBECODE",
    timeLimitSeconds: 600,
  });

  const apiGatewayTetris = await upsertProblem({
    title: "API Gateway Tetris: version negotiation",
    tier: "JUNIOR",
    isPublic: true,
    defaultPersonaId: classic.id,
    description:
      "Each client requires an integer API version in a closed range [min,max]. The gateway can expose **one** version V to all for this release train. Given client ranges [[min,max], ...], choose the smallest V that satisfies the max number of clients. Return {version: V, satisfied: K}. If multiple V satisfy the same K, choose the smallest V. If no client can be satisfied (empty input), return {version: -1, satisfied: 0}. (Hint: classic line sweep / range stabbing.)",
    difficulty: "Easy",
    examples: {
      input: "ranges=[[1,3],[2,4],[2,2],[5,9]]",
      output: "{\"version\":2,\"satisfied\":3}"
    },
    tests: [
      { input: "ranges=[[1,3],[2,4],[2,2],[5,9]]", output: "{\"version\":2,\"satisfied\":3}" },
      { input: "ranges=[[10,10],[8,12],[9,11]]", output: "{\"version\":10,\"satisfied\":3}" },
      { input: "ranges=[]", output: "{\"version\":-1,\"satisfied\":0}" }
    ],
    editorMode: "VIBECODE",
    timeLimitSeconds: 600,
  });
  await setTests(apiGatewayTetris.id, [
    // Visible example
    { input: [[[1,3],[2,4],[2,2],[5,9]]], expected: {version:2,satisfied:3}, hidden: false },
    // All overlap on 10
    { input: [[[10,10],[8,12],[9,11]]], expected: {version:10,satisfied:3} },
    // Two equal optima → pick smallest version
    { input: [[[1,2],[2,3],[4,5]]], expected: {version:2,satisfied:2} },
    // Empty
    { input: [[]], expected: {version:-1,satisfied:0} },
  ]);
  await setTests(jenkinsFarm.id, [
    // Visible example
    { input: [["A","B"],[3,2,4,1]], expected: ["A","B","B","A"], hidden: false },
    // Three servers, equal lengths
    { input: [["s1","s2","s3"],[5,5,5,5,5]], expected: ["s1","s2","s3","s1","s2"] },
    // Single server
    { input: [["node-1"],[1,2,3]], expected: ["node-1","node-1","node-1"] },
    // Tie on next-available → lexicographic server id
    { input: [["aa","ab"],[1,1,1,1]], expected: ["aa","ab","aa","ab"] },
  ]);



  const rbacHungerGames = await upsertProblem({
    title: "RBAC Hunger Games",
    tier: "JUNIOR",
    isPublic: true,
    defaultPersonaId: classic.id,
    description:
      "Security said ‘principle of least privilege’; your PM said ‘just make it work before the demo.’ You’re handed a pile of roles that overlap like a Venn diagram drawn during a tequila tasting. \n\nGiven required permissions (strings) and roles = [{name, perms:[…]}], pick the **smallest number of roles** whose union covers all required permissions. If multiple choices cover with the same count, prefer the lexicographically smallest **ordered list** by role name (compare element by element). If coverage is impossible, return []. Your solution should implement the classic greedy set cover: repeatedly pick the role that covers the most currently uncovered permissions; ties broken by lexicographic role name. Return the chosen role names in pick order.",
    difficulty: "Medium",
    examples: {
      input:
        "required=[\"read\",\"write\",\"deploy\"],roles=[{\"name\":\"Eng\",\"perms\":[\"read\",\"write\"]},{\"name\":\"DevOps\",\"perms\":[\"deploy\",\"write\"]},{\"name\":\"Viewer\",\"perms\":[\"read\"]}]",
      output: "[\"Eng\",\"DevOps\"]"
    },
    tests: [
      {
        input:
          "required=[\"read\",\"write\",\"deploy\"],roles=[{\"name\":\"Eng\",\"perms\":[\"read\",\"write\"]},{\"name\":\"DevOps\",\"perms\":[\"deploy\",\"write\"]},{\"name\":\"Viewer\",\"perms\":[\"read\"]}]",
        output: "[\"Eng\",\"DevOps\"]"
      },
      {
        input:
          "required=[\"ship\",\"pager\",\"grafana\"],roles=[{\"name\":\"SRE\",\"perms\":[\"pager\",\"grafana\"]},{\"name\":\"Lead\",\"perms\":[\"ship\"]},{\"name\":\"Intern\",\"perms\":[\"coffee\"]}]",
        output: "[\"SRE\",\"Lead\"]"
      },
      {
        input:
          "required=[\"root\"],roles=[{\"name\":\"Almost\",\"perms\":[\"ro\"]},{\"name\":\"Nearly\",\"perms\":[\"oot\"]}]",
        output: "[]"
      }
    ],
    editorMode: "VIBECODE",
    timeLimitSeconds: 600,
  });
  await setTests(rbacHungerGames.id, [
    // Visible example
    {
      input: [
        ["read","write","deploy"],
        [{name:"Eng",perms:["read","write"]},{name:"DevOps",perms:["deploy","write"]},{name:"Viewer",perms:["read"]}]
      ],
      expected: ["Eng","DevOps"],
      hidden: false
    },
    // Tie on coverage size → lexicographic role name wins for the pick
    {
      input: [
        ["a","b","c"],
        [{name:"A",perms:["a","b"]},{name:"B",perms:["b","c"]},{name:"C",perms:["a","c"]}]
      ],
      expected: ["A","B"]
    },
    // Impossible coverage
    {
      input: [
        ["root"],
        [{name:"Almost",perms:["ro"]},{name:"Nearly",perms:["oot"]}]
      ],
      expected: []
    },
    // Larger set; ensure greedy order is returned
    {
      input: [
        ["log","metric","trace","deploy"],
        [
          {name:"Observability",perms:["log","metric","trace"]},
          {name:"Release",perms:["deploy"]},
          {name:"MetricsOnly",perms:["metric"]},
          {name:"EverythingButDeploy",perms:["log","metric","trace"]}
        ]
      ],
      expected: ["Observability","Release"]
    },
  ]);


  const microserviceTheatre = await upsertProblem({
    title: "“We killed the monolith” (and p95 with it)",
    tier: "JUNIOR",
    isPublic: true,
    defaultPersonaId: classic.id,
    description:
      "Leadership sunset the monolith after a three-slide vision deck titled “Unbundling Synergies.” Now a single request fans out across 200 microservices that handshake, sidecar, and yolo-trace each other before finally returning the same JSON the monolith used to spit out in 80ms. SRE swears the new p95 is “educational.”\n\nYou’re given:\n- deps: pairs [A,B] meaning A depends on B (A → B). A cannot *start* until each B finishes.\n- latencies: array of { name, ms } for node execution times.\n- root: the top-level service we’re calling.\n- hopTax: integer ms added for **each edge on the critical path** (think TLS/SNI/sidecar/mesh tax per call).\n\nScheduling semantics (DAG, no retries): any service can start when *all* its direct dependencies finished; leaves start at t=0. For a node N: start(N) = max over deps D of (finish(D) + hopTax); finish(N) = start(N) + latency(N). The request completes at finish(root). If there’s a cycle reachable from root, return {latency:-1, batches:[]}. Ignore nodes not reachable from root.\n\nReturn an object:\n- { latency: totalMs, batches: string[][] }\nWhere batches is the level-by-level start schedule: each inner array lists services that start at the same time, sorted lexicographically; outer array is ordered by increasing start time.\n\nTL;DR: compute earliest-start times on a dependency DAG (plus per-edge tax), detect cycles, group nodes by start time, and report the root’s finish time. (Yes, the monolith was faster. No, we’re not going back.)",
    difficulty: "Medium",
    examples: {
      input:
        "deps=[[\"Frontend\",\"API\"],[\"Frontend\",\"CDN\"],[\"API\",\"DB\"],[\"API\",\"User\"],[\"DB\",\"Storage\"]],latencies=[{\"name\":\"Frontend\",\"ms\":10},{\"name\":\"API\",\"ms\":30},{\"name\":\"CDN\",\"ms\":5},{\"name\":\"DB\",\"ms\":50},{\"name\":\"User\",\"ms\":20},{\"name\":\"Storage\",\"ms\":40}],root=\"Frontend\",hopTax=5",
      output:
        "{\"latency\":145,\"batches\":[[\"CDN\",\"Storage\",\"User\"],[\"DB\"],[\"API\"],[\"Frontend\"]]}"
    },
    tests: [
      {
        input:
          "deps=[[\"Frontend\",\"API\"],[\"Frontend\",\"CDN\"],[\"API\",\"DB\"],[\"API\",\"User\"],[\"DB\",\"Storage\"]],latencies=[{\"name\":\"Frontend\",\"ms\":10},{\"name\":\"API\",\"ms\":30},{\"name\":\"CDN\",\"ms\":5},{\"name\":\"DB\",\"ms\":50},{\"name\":\"User\",\"ms\":20},{\"name\":\"Storage\",\"ms\":40}],root=\"Frontend\",hopTax=5",
        output:
          "{\"latency\":145,\"batches\":[[\"CDN\",\"Storage\",\"User\"],[\"DB\"],[\"API\"],[\"Frontend\"]]}"
      },
      {
        input:
          "deps=[[\"R\",\"A\"],[\"R\",\"B\"],[\"A\",\"C\"],[\"B\",\"C\"]],latencies=[{\"name\":\"R\",\"ms\":1},{\"name\":\"A\",\"ms\":10},{\"name\":\"B\",\"ms\":10},{\"name\":\"C\",\"ms\":10}],root=\"R\",hopTax=0",
        output:
          "{\"latency\":21,\"batches\":[[\"C\"],[\"A\",\"B\"],[\"R\"]]}"
      },
      {
        input:
          "deps=[[\"A\",\"B\"],[\"B\",\"A\"]],latencies=[{\"name\":\"A\",\"ms\":5},{\"name\":\"B\",\"ms\":5}],root=\"A\",hopTax=1",
        output:
          "{\"latency\":-1,\"batches\":[]}"
      },
      {
        input:
          "deps=[],latencies=[{\"name\":\"Solo\",\"ms\":7},{\"name\":\"Noise\",\"ms\":3}],root=\"Solo\",hopTax=9",
        output:
          "{\"latency\":7,\"batches\":[[\"Solo\"]]}"
      }
    ],
    editorMode: "VIBECODE",
    timeLimitSeconds: 600,
  });
  
  const monolithKill = await upsertProblem({
  title: "“Kill the monolith",
  tier: "JUNIOR",
  isPublic: true,
  defaultPersonaId: classic.id,
  description:
    "Leadership sunset the monolith after a three-slide vision deck titled “Unbundling Synergies.” Now a single request fans out across 200 microservices that handshake, sidecar, and yolo-trace each other before finally returning the same JSON the monolith used to spit out in 80ms. SRE swears the new p95 is “educational.”\n\nYou’re given:\n- deps: pairs [A,B] meaning A depends on B (A → B). A cannot *start* until each B finishes.\n- latencies: array of { name, ms } for node execution times.\n- root: the top-level service we’re calling.\n- hopTax: integer ms added for **each edge on the critical path** (think TLS/SNI/sidecar/mesh tax per call).\n\nScheduling semantics (DAG, no retries): any service can start when *all* its direct dependencies finished; leaves start at t=0. For a node N: start(N) = max over deps D of (finish(D) + hopTax); finish(N) = start(N) + latency(N). The request completes at finish(root). If there’s a cycle reachable from root, return {latency:-1, batches:[]}. Ignore nodes not reachable from root.\n\nReturn an object:\n- { latency: totalMs, batches: string[][] }\nWhere batches is the level-by-level start schedule: each inner array lists services that start at the same time, sorted lexicographically; outer array is ordered by increasing start time.\n\nTL;DR: compute earliest-start times on a dependency DAG (plus per-edge tax), detect cycles, group nodes by start time, and report the root’s finish time. (Yes, the monolith was faster. No, we’re not going back.)",
  difficulty: "Medium",
  examples: {
    input:
      "deps=[[\"Frontend\",\"API\"],[\"Frontend\",\"CDN\"],[\"API\",\"DB\"],[\"API\",\"User\"],[\"DB\",\"Storage\"]],latencies=[{\"name\":\"Frontend\",\"ms\":10},{\"name\":\"API\",\"ms\":30},{\"name\":\"CDN\",\"ms\":5},{\"name\":\"DB\",\"ms\":50},{\"name\":\"User\",\"ms\":20},{\"name\":\"Storage\",\"ms\":40}],root=\"Frontend\",hopTax=5",
    output:
      "{\"latency\":145,\"batches\":[[\"CDN\",\"Storage\",\"User\"],[\"DB\"],[\"API\"],[\"Frontend\"]]}"
  },
  tests: [
    {
      input:
        "deps=[[\"Frontend\",\"API\"],[\"Frontend\",\"CDN\"],[\"API\",\"DB\"],[\"API\",\"User\"],[\"DB\",\"Storage\"]],latencies=[{\"name\":\"Frontend\",\"ms\":10},{\"name\":\"API\",\"ms\":30},{\"name\":\"CDN\",\"ms\":5},{\"name\":\"DB\",\"ms\":50},{\"name\":\"User\",\"ms\":20},{\"name\":\"Storage\",\"ms\":40}],root=\"Frontend\",hopTax=5",
      output:
        "{\"latency\":145,\"batches\":[[\"CDN\",\"Storage\",\"User\"],[\"DB\"],[\"API\"],[\"Frontend\"]]}"
    },
    {
      input:
        "deps=[[\"R\",\"A\"],[\"R\",\"B\"],[\"A\",\"C\"],[\"B\",\"C\"]],latencies=[{\"name\":\"R\",\"ms\":1},{\"name\":\"A\",\"ms\":10},{\"name\":\"B\",\"ms\":10},{\"name\":\"C\",\"ms\":10}],root=\"R\",hopTax=0",
      output:
        "{\"latency\":21,\"batches\":[[\"C\"],[\"A\",\"B\"],[\"R\"]]}"
    },
    {
      input:
        "deps=[[\"A\",\"B\"],[\"B\",\"A\"]],latencies=[{\"name\":\"A\",\"ms\":5},{\"name\":\"B\",\"ms\":5}],root=\"A\",hopTax=1",
      output:
        "{\"latency\":-1,\"batches\":[]}"
    },
    {
      input:
        "deps=[],latencies=[{\"name\":\"Solo\",\"ms\":7},{\"name\":\"Noise\",\"ms\":3}],root=\"Solo\",hopTax=9",
      output:
        "{\"latency\":7,\"batches\":[[\"Solo\"]]}"
    }
  ],
  editorMode: "VIBECODE",
  timeLimitSeconds: 600,
});
await setTests(monolithKill.id, [
  // Visible example: parallel leaves, deep chain, hop tax
  {
    input: [
      [["Frontend","API"],["Frontend","CDN"],["API","DB"],["API","User"],["DB","Storage"]],
      [{name:"Frontend",ms:10},{name:"API",ms:30},{name:"CDN",ms:5},{name:"DB",ms:50},{name:"User",ms:20},{name:"Storage",ms:40}],
      "Frontend",
      5
    ],
    expected: { latency:145, batches:[["CDN","Storage","User"],["DB"],["API"],["Frontend"]] },
    hidden: false
  },

  // Diamond fan-in; zero hop tax; batches reflect earliest starts
  {
    input: [
      [["R","A"],["R","B"],["A","C"],["B","C"]],
      [{name:"R",ms:1},{name:"A",ms:10},{name:"B",ms:10},{name:"C",ms:10}],
      "R",
      0
    ],
    expected: { latency:21, batches:[["C"],["A","B"],["R"]] }
  },

  // Cycle reachable from root ⇒ impossible
  {
    input: [
      [["A","B"],["B","A"]],
      [{name:"A",ms:5},{name:"B",ms:5}],
      "A",
      1
    ],
    expected: { latency:-1, batches:[] }
  },

  // Root with no deps; unrelated junk ignored
  {
    input: [
      [],
      [{name:"Solo",ms:7},{name:"Noise",ms:3}],
      "Solo",
      9
    ],
    expected: { latency:7, batches:[["Solo"]] }
  },

  // Equal start times across multiple nodes + hop tax
  {
    input: [
      [["Top","X"],["Top","Y"]],
      [{name:"Top",ms:5},{name:"X",ms:10},{name:"Y",ms:10}],
      "Top",
      3
    ],
    // X and Y both start at 0, finish at 10; Top starts at max(10+3,10+3)=13, finishes at 18
    expected: { latency:18, batches:[["X","Y"],["Top"]] }
  },
]);

  
const secretsBlastRadius = await upsertProblem({
  title: "API Keys pushed to GitHub",
  tier: "SENIOR",
  isPublic: true,
  defaultPersonaId: classic.id,
  description:
    "Friday 17:59. Someone pushed `.env` to GitHub. Security created a war room named “hotdog-stand.” Your VP asks: *Which deploys are compromised?* \n\nYou’re given a chronological event log. Events:\n- { type:\"leak\", t, secret } — a credential is publicly exposed at time t (integer minutes).\n- { type:\"rotate\", t, secret } — that credential is rotated at t; leaks before this are now neutralized.\n- { type:\"deploy\", t, id, service, secrets:[...] } — a deploy occurred using a set of secret IDs.\n\n**Rule**: A secret is “compromised” from the time of its most recent leak **until** the next rotate for that secret (half-open interval [leak, rotate)). A deploy is compromised if **any** of its secrets is compromised at its deploy time. Multiple leaks before a rotate do not stack; only the latest matters. Ignore secrets never leaked. Events are already sorted by t. \n\nReturn the list of compromised deploy `id`s in the order the deploys appear. \n\n(Yes, Legal wants a spreadsheet. No, they won’t read it.)",
  difficulty: "Medium",
  examples: {
    input:
      "events=[{type:\"leak\",t:10,secret:\"S1\"},{type:\"deploy\",t:12,id:\"d1\",service:\"api\",secrets:[\"S1\"]},{type:\"deploy\",t:14,id:\"d2\",service:\"web\",secrets:[\"S2\"]},{type:\"rotate\",t:15,secret:\"S1\"},{type:\"deploy\",t:16,id:\"d3\",service:\"api\",secrets:[\"S1\",\"S2\"]}]",
    output: "[\"d1\"]"
  },
  tests: [
    {
      input:
        "events=[{type:\"leak\",t:10,secret:\"S1\"},{type:\"deploy\",t:12,id:\"d1\",service:\"api\",secrets:[\"S1\"]},{type:\"deploy\",t:14,id:\"d2\",service:\"web\",secrets:[\"S2\"]},{type:\"rotate\",t:15,secret:\"S1\"},{type:\"deploy\",t:16,id:\"d3\",service:\"api\",secrets:[\"S1\",\"S2\"]}]",
      output: "[\"d1\"]"
    },
    {
      input:
        "events=[{type:\"leak\",t:1,secret:\"K\"},{type:\"deploy\",t:1,id:\"a\",service:\"auth\",secrets:[\"K\"]},{type:\"leak\",t:2,secret:\"K\"},{type:\"deploy\",t:3,id:\"b\",service:\"auth\",secrets:[\"K\"]},{type:\"rotate\",t:4,secret:\"K\"},{type:\"deploy\",t:5,id:\"c\",service:\"auth\",secrets:[\"K\"]}]",
      output: "[\"a\",\"b\"]"
    },
    {
      input:
        "events=[{type:\"deploy\",t:5,id:\"x\",service:\"svc\",secrets:[\"S\"]},{type:\"rotate\",t:6,secret:\"S\"}]",
      output: "[]"
    }
  ],
  editorMode: "VIBECODE",
  timeLimitSeconds: 900,
});
await setTests(secretsBlastRadius.id, [
  // Visible example
  {
    input: [[
      {type:"leak",t:10,secret:"S1"},
      {type:"deploy",t:12,id:"d1",service:"api",secrets:["S1"]},
      {type:"deploy",t:14,id:"d2",service:"web",secrets:["S2"]},
      {type:"rotate",t:15,secret:"S1"},
      {type:"deploy",t:16,id:"d3",service:"api",secrets:["S1","S2"]}
    ]],
    expected: ["d1"],
    hidden: false
  },
  // Multiple leak windows for same key before rotate
  {
    input: [[
      {type:"leak",t:1,secret:"K"},
      {type:"deploy",t:1,id:"a",service:"auth",secrets:["K"]},
      {type:"leak",t:2,secret:"K"},
      {type:"deploy",t:3,id:"b",service:"auth",secrets:["K"]},
      {type:"rotate",t:4,secret:"K"},
      {type:"deploy",t:5,id:"c",service:"auth",secrets:["K"]}
    ]],
    expected: ["a","b"]
  },
  // Overlapping secrets; any compromised -> deploy compromised
  {
    input: [[
      {type:"leak",t:10,secret:"A"},
      {type:"leak",t:11,secret:"B"},
      {type:"deploy",t:12,id:"m1",service:"mix",secrets:["A","B"]},
      {type:"rotate",t:13,secret:"A"},
      {type:"deploy",t:14,id:"m2",service:"mix",secrets:["A","B"]},
      {type:"rotate",t:15,secret:"B"}
    ]],
    expected: ["m1","m2"]
  },
  // No leaks at all
  { input: [[{type:"deploy",t:1,id:"d",service:"s",secrets:["X"]}]], expected: [] },
]);

const benchBoss = await upsertProblem({
  title: "Bench Boss’",
  tier: "SENIOR",
  isPublic: true,
  defaultPersonaId: classic.id,
  description:
    "Staff meeting ended with a Gantt chart and three action items named \"Strategy.\" You must assign devs to projects like a benevolent air traffic controller. \n\nYou’re given:\n- coders = [{ name, skills:[…] }]\n- projects = [{ name, requires:[…] }]\n- benchPenalty (integer) — the cost of benching a coder this quarter.\n\n**Cost model (Hungarian assignment)**:\n- For coder C and project P, cost = (# of required skills in P not present in C.skills) * 100. (0 means fully qualified; larger = ramp-up pain.)\n- A coder may instead be assigned to **BENCH** with cost = benchPenalty.\n- Assume projects.length ≤ coders.length. (If not, pad coders with imaginary contractors having empty skills and benchPenalty = 10^9.)\n\nGoal: minimize total cost via assignment. Return an object:\n- { assigned: [{ coder, project }...], benched: [coderName,...] }\nWhere `assigned` is sorted by coder name, and `benched` is lexicographically sorted. If multiple optimal solutions exist, prefer the lexicographically smallest list of (coder,project) pairs when compared element-by-element by coder then project.",
  difficulty: "Hard",
  examples: {
    input:
      "coders=[{name:\"Ana\",skills:[\"go\",\"sql\"]},{name:\"Bo\",skills:[\"js\",\"react\"]},{name:\"Kim\",skills:[\"python\",\"ml\"]}],projects=[{name:\"dash\",requires:[\"js\"]},{name:\"etl\",requires:[\"sql\",\"python\"]}],benchPenalty=150",
    output:
      "{\"assigned\":[{\"coder\":\"Ana\",\"project\":\"etl\"},{\"coder\":\"Bo\",\"project\":\"dash\"}],\"benched\":[\"Kim\"]}"
  },
  tests: [
    {
      input:
        "coders=[{name:\"Ana\",skills:[\"go\",\"sql\"]},{name:\"Bo\",skills:[\"js\",\"react\"]},{name:\"Kim\",skills:[\"python\",\"ml\"]}],projects=[{name:\"dash\",requires:[\"js\"]},{name:\"etl\",requires:[\"sql\",\"python\"]}],benchPenalty=150",
      output:
        "{\"assigned\":[{\"coder\":\"Ana\",\"project\":\"etl\"},{\"coder\":\"Bo\",\"project\":\"dash\"}],\"benched\":[\"Kim\"]}"
    },
    {
      input:
        "coders=[{name:\"A\",skills:[\"php\"]},{name:\"B\",skills:[\"php\",\"redis\"]}],projects=[{name:\"billing\",requires:[\"redis\"]}],benchPenalty=50",
      output:
        "{\"assigned\":[{\"coder\":\"B\",\"project\":\"billing\"}],\"benched\":[\"A\"]}"
    },
    {
      input:
        "coders=[{name:\"Z\",skills:[]},{name:\"Y\",skills:[]}],projects=[{name:\"A\",requires:[\"rust\"]}],benchPenalty=1",
      output:
        "{\"assigned\":[{\"coder\":\"Y\",\"project\":\"A\"}],\"benched\":[\"Z\"]}"
    }
  ],
  editorMode: "VIBECODE",
  timeLimitSeconds: 1200,
});
await setTests(benchBoss.id, [
  // Visible example
  {
    input: [
      [{name:"Ana",skills:["go","sql"]},{name:"Bo",skills:["js","react"]},{name:"Kim",skills:["python","ml"]}],
      [{name:"dash",requires:["js"]},{name:"etl",requires:["sql","python"]}],
      150
    ],
    expected: {
      assigned:[{coder:"Ana",project:"etl"},{coder:"Bo",project:"dash"}],
      benched:["Kim"]
    },
    hidden: false
  },
  // Prefer fully qualified over partial + bench
  {
    input: [
      [{name:"A",skills:["php"]},{name:"B",skills:["php","redis"]}],
      [{name:"billing",requires:["redis"]}],
      50
    ],
    expected: { assigned:[{coder:"B",project:"billing"}], benched:["A"] }
  },
  // Everyone bad → choose one sacrificial assignment (cost 100) vs bench (1) → Assign lexicographically smallest coder to project, bench the other
  {
    input: [
      [{name:"Z",skills:[]},{name:"Y",skills:[]}],
      [{name:"A",requires:["rust"]}],
      1
    ],
    expected: { assigned:[{coder:"Y",project:"A"}], benched:["Z"] }
  },
  // Multiple projects and coders; tie-breaking by coder then project
  {
    input: [
      [{name:"A",skills:["go"]},{name:"B",skills:["go"]},{name:"C",skills:["go"]}],
      [{name:"P1",requires:["go"]},{name:"P2",requires:["go"]}],
      1000
    ],
    expected: { assigned:[{coder:"A",project:"P1"},{coder:"B",project:"P2"}], benched:["C"] }
  },
]);


const spendDrillSergeant = await upsertProblem({
  title: "Cost-down drill",
  tier: "SENIOR",
  isPublic: true,
  defaultPersonaId: classic.id,
  description:
    "Quarterly business review. Slides say “Do more with less.” You must pick which workloads to pause to hit a savings target while hurting as few feelings (impact) as possible. \n\nInput:\n- target (integer): minimum monthly cost to cut.\n- items = [{ name, cost, impact }] with positive integers.\n\nSelect a subset whose total cost ≥ target while **minimizing total impact**. Tie-breakers: (1) among solutions with equal impact, choose the one with **greater** total cost saved; (2) if still tied, pick the lexicographically smallest sorted list of names. Return the chosen names sorted lexicographically. (Classic DP variant: minimize impact under a cost-at-least constraint.)",
  difficulty: "Medium",
  examples: {
    input:
      "target=10,items=[{\"name\":\"batchA\",\"cost\":6,\"impact\":4},{\"name\":\"gpuLab\",\"cost\":7,\"impact\":10},{\"name\":\"canary\",\"cost\":5,\"impact\":3}]",
    output: "[\"batchA\",\"canary\"]"
  },
  tests: [
    {
      input:
        "target=10,items=[{\"name\":\"batchA\",\"cost\":6,\"impact\":4},{\"name\":\"gpuLab\",\"cost\":7,\"impact\":10},{\"name\":\"canary\",\"cost\":5,\"impact\":3}]",
      output: "[\"batchA\",\"canary\"]"
    },
    {
      input:
        "target=8,items=[{\"name\":\"logs\",\"cost\":3,\"impact\":1},{\"name\":\"metrics\",\"cost\":3,\"impact\":1},{\"name\":\"traces\",\"cost\":3,\"impact\":1}]",
      output: "[\"logs\",\"metrics\",\"traces\"]"
    },
    {
      input:
        "target=4,items=[{\"name\":\"x\",\"cost\":2,\"impact\":5},{\"name\":\"y\",\"cost\":2,\"impact\":5},{\"name\":\"z\",\"cost\":5,\"impact\":6}]",
      output: "[\"x\",\"y\"]"
    }
  ],
  editorMode: "VIBECODE",
  timeLimitSeconds: 900,
});
await setTests(spendDrillSergeant.id, [
  // Visible example
  {
    input: [10,[{name:"batchA",cost:6,impact:4},{name:"gpuLab",cost:7,impact:10},{name:"canary",cost:5,impact:3}]],
    expected: ["batchA","canary"],
    hidden: false
  },
  // Need all three to reach 9 ≥ 8 with minimal impact (=3); bigger savings is also fine if impact equal
  {
    input: [8,[{name:"logs",cost:3,impact:1},{name:"metrics",cost:3,impact:1},{name:"traces",cost:3,impact:1}]],
    expected: ["logs","metrics","traces"]
  },
  // Two light-impact picks beat one heavy-impact pick, even if total saved equals target
  {
    input: [4,[{name:"x",cost:2,impact:5},{name:"y",cost:2,impact:5},{name:"z",cost:5,impact:6}]],
    expected: ["x","y"]
  },
  // Tie on impact → prefer greater cost saved → choose {a,c} over {b,c} if both impact 5 but cost higher
  {
    input: [7,[{name:"a",cost:2,impact:2},{name:"b",cost:2,impact:2},{name:"c",cost:5,impact:3}]],
    expected: ["a","c"]
  },
]);

//personas linked to problems
await linkPersonaToProblem({ problemId: scopeCreepDiff.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: scopeCreepDiff.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: scopeCreepDiff.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: scopeCreepDiff.id, personaId: lead.id,      sortOrder: 5 });
await linkPersonaToProblem({ problemId: scopeCreepDiff.id, personaId: clueless.id,  sortOrder: 1 });

await linkPersonaToProblem({ problemId: incidentTimeline.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: incidentTimeline.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: incidentTimeline.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: incidentTimeline.id, personaId: lead.id,      sortOrder: 5 });
await linkPersonaToProblem({ problemId: incidentTimeline.id, personaId: clueless.id,  sortOrder: 1 });

await linkPersonaToProblem({ problemId: lowestCommonManager.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: lowestCommonManager.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: lowestCommonManager.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: lowestCommonManager.id, personaId: lead.id,      sortOrder: 5 });
await linkPersonaToProblem({ problemId: lowestCommonManager.id, personaId: clueless.id,  sortOrder: 1 });

await linkPersonaToProblem({ problemId: cycleOfBlame.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: cycleOfBlame.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: cycleOfBlame.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: cycleOfBlame.id, personaId: lead.id,      sortOrder: 5 });
await linkPersonaToProblem({ problemId: cycleOfBlame.id, personaId: clueless.id,  sortOrder: 1 });


await linkPersonaToProblem({ problemId: inboxDetox.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: inboxDetox.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: inboxDetox.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: inboxDetox.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: inboxDetox.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: snackBudgetSum.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: snackBudgetSum.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: snackBudgetSum.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: snackBudgetSum.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: snackBudgetSum.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: standupOrder.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: standupOrder.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: standupOrder.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: standupOrder.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: standupOrder.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: wellnessStreak.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: wellnessStreak.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: wellnessStreak.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: wellnessStreak.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: wellnessStreak.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: csvRescue.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: csvRescue.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: csvRescue.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: csvRescue.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: csvRescue.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: storyPointCageMatch.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: storyPointCageMatch.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: storyPointCageMatch.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: storyPointCageMatch.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: storyPointCageMatch.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: apiGatewayTetris.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: apiGatewayTetris.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: apiGatewayTetris.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: apiGatewayTetris.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: apiGatewayTetris.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: jenkinsFarm.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: jenkinsFarm.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: jenkinsFarm.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: jenkinsFarm.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: jenkinsFarm.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: meetingMaximizer.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: meetingMaximizer.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: meetingMaximizer.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: meetingMaximizer.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: meetingMaximizer.id, personaId: lead.id,      sortOrder: 5 });


await linkPersonaToProblem({ problemId: rbacHungerGames.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: rbacHungerGames.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: rbacHungerGames.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: rbacHungerGames.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: rbacHungerGames.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: monolithKill.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: monolithKill.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: monolithKill.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: monolithKill.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: monolithKill.id, personaId: lead.id,      sortOrder: 5 });


await linkPersonaToProblem({ problemId: spendDrillSergeant.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: spendDrillSergeant.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: spendDrillSergeant.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: spendDrillSergeant.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: spendDrillSergeant.id, personaId: lead.id,      sortOrder: 5 });

await linkPersonaToProblem({ problemId: benchBoss.id, personaId: clueless.id,  sortOrder: 1 });
await linkPersonaToProblem({ problemId: benchBoss.id, personaId: ceo.id,       sortOrder: 2 });
await linkPersonaToProblem({ problemId: benchBoss.id, personaId: bro_junior.id,sortOrder: 3 });
await linkPersonaToProblem({ problemId: benchBoss.id, personaId: senior.id,    sortOrder: 4 });
await linkPersonaToProblem({ problemId: benchBoss.id, personaId: lead.id,      sortOrder: 5 });


// 4) Backfill defaultPersonaId per problem (fallback to classic)
for (const p of [scopeCreepDiff, incidentTimeline, lowestCommonManager, cycleOfBlame]) {
  const link = await prisma.problemPersona.findFirst({
    where: { problemId: p.id, isDefault: true },
    select: { personaId: true }
  });
  await prisma.problem.update({
    where: { id: p.id },
    data: { defaultPersonaId: link ? link.personaId : classic.id }
  });

  
  const scopeCreepDiff = await upsertProblem({
    title: "Scope-Creep Diff",
    defaultPersonaId: classic.id,
    description:
      "PM changed the spec mid-sprint—figure out what actually changed. Given two lists of strings, return the items present in 'new' but not in 'old', preserving their order as in 'new'.",
    difficulty: "Medium",
    // Keep examples for the UI; runner won’t use these:
    examples: { input: "old=[\"login\",\"logout\"], new=[\"login\",\"export\"]", output: "[\"export\"]" },
    // You can keep this `tests` blob if you like, but it won't be read by the runner.
  });
  
  // Materialize executable tests for the runner (note the input SHAPE):
  await setTests(scopeCreepDiff.id, [
    { input: [["login","logout"], ["login","export"]], expected: ["export"], hidden: false },
    { input: [["a","b"], ["b","c","b","d"]],          expected: ["c","d"] },
  ]);
  
 

  await setTests(incidentTimeline.id, [
    // Visible example
    { input: [["9:5","09:05:10","09:04"]],
      expected: ["09:04:00","09:05:00","09:05:10"], hidden: false },
  
    // Midnight boundary
    { input: [["23:59","0:00","00:00:30"]],
      expected: ["00:00:00","00:00:30","23:59:00"] },
  
    // Mixed precisions + duplicates
    { input: [["7:3:9","7:03","07:03:00","07:03:09"]],
      expected: ["07:03:00","07:03:00","07:03:09","07:03:09"] },
  
    // Many ways to write noon; ensure normalization + ordering
    { input: [["12:00","12:00:00","12:0","12:00:01","11:59:59"]],
      expected: ["11:59:59","12:00:00","12:00:00","12:00:00","12:00:01"] },
  
    // Seconds vs no-seconds, close together
    { input: [["00:00:59","00:01","00:00:09"]],
      expected: ["00:00:09","00:00:59","00:01:00"] },
  ]);

  // Lowest Common Manager (LCA)
await setTests(lowestCommonManager.id, [
  // Basic sibling case (visible)
  { input: [["CEO","VP1","VP2","A","B","C","D"], "A", "B"],
    expected: "VP1", hidden: false },

  // One is ancestor of the other
  { input: [["CEO","VP1","VP2","A",null,null,null], "A", "VP1"],
    expected: "VP1" },

  // Missing node → empty string
  { input: [["CEO","VP1","VP2"], "X", "VP2"],
    expected: "" },

  // Same node → itself
  { input: [["CEO","VP1","VP2","A","B",null,null], "A", "A"],
    expected: "A" },

  // Cross-branch with null gaps → root is LCA
  { input: [["CEO","VP1","VP2",null,"Mgr","C","D"], "Mgr", "C"],
    expected: "CEO" },
]);

// Cycle of Blame (Directed Cycle Detect)
await setTests(cycleOfBlame.id, [
  // Simple 3-cycle (visible)
  { input: [[["A","B"],["B","C"],["C","A"]]],
    expected: ["A","B","C","A"], hidden: false },

  // Prefer cycle whose start node is lexicographically smallest (A over X)
  { input: [[["X","X"],["A","B"],["B","A"]]],
    expected: ["A","B","A"] },

  // No cycle
  { input: [[["A","B"],["B","C"],["C","D"]]],
    expected: [] },

  // Two disjoint cycles; pick one starting at smallest start ("A" vs "C")
  { input: [[["B","A"],["A","B"],["C","D"],["D","C"]]],
    expected: ["A","B","A"] },


]);

await setTests(inboxDetox.id, [
  { input: ["Re: RE: [FYI] (Draft) Lunch & Learn"], expected: "Lunch & Learn", hidden: false },
  { input: ["fwd:   (internal)   [noreply] Quarterly Review"], expected: "Quarterly Review" },
  { input: ["Monthly Report"], expected: "Monthly Report" },
  { input: ["RE: FWD: Re: (spam) [auto] Project kickoff"], expected: "Project kickoff" },
  { input: ["Status: re: not a prefix"], expected: "Status: re: not a prefix" }, // not leading → keep
]);

// Snack Budget Sum (Add the Deltas)
await setTests(snackBudgetSum.id, [
  { input: ["+3, -1, +4"], expected: 6, hidden: false },
  { input: ["+10, -2, -3"], expected: 5 },
  { input: ["0"], expected: 0 },
  { input: [" -5 , +5 , +5 , -10 , 0 "], expected: -5 },
  { input: ["+0002, -0001"], expected: 1 },
]);

// Standup Order (Earliest First)
await setTests(standupOrder.id, [
  { input: [["Sam 09:05","Ana 8:59","Lee 09:05"]], expected: ["Ana","Sam","Lee"], hidden: false },
  { input: [["Kim 7:5","Bo 07:05","Al 06:59"]], expected: ["Al","Kim","Bo"] },
  
  { input: [["A 0:0","B 00:00","C 00:00"]], expected: ["A","B","C"] }, // tie keeps input order
  { input: [["Jo 13:07","Zed 13:06","Ann 13:07"]], expected: ["Zed","Jo","Ann"] },
]);

// CSV Rescue (Trim & Filter)
await setTests(csvRescue.id, [
  { input: ["a, b , ,c ,d,, "], expected: ["a","b","c","d"], hidden: false },
  { input: [","], expected: [] },
  { input: ["  roadmap  "], expected: ["roadmap"] },
  { input: ["one,, two , , three"], expected: ["one","two","three"] },
  { input: ["  , , , "], expected: [] },
  { input: ["a,b,c"], expected: ["a","b","c"] },
]);

// Wellness Streak (Steps ≥ Goal)
await setTests(wellnessStreak.id, [
  { input: [[4000,10000,12000,8000,10000], 9000], expected: 2, hidden: false },
  { input: [[10000,10000,10000], 8000], expected: 3 },
  { input: [[5000,4000,3000], 6000], expected: 0 },
  { input: [[], 1], expected: 0 },
  { input: [[8000,9000,9000,9000], 9000], expected: 3 },
  { input: [[9000,8000,9000,8000,9000], 9000], expected: 1 },
]);
  
}
}
main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
