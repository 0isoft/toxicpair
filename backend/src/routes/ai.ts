// backend/src/routes/ai.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import OpenAI from "openai";
import { getOrCreateProblemSession } from "../lib/sessions";

// Import precise message types to avoid TS union narrowing issues
import type {
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
} from "openai/resources/chat/completions";

const router = Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ---------- helpers ----------

const Body = z.object({
  problemId: z.number().int().positive(),
  language: z.enum(["javascript", "python", "cpp"]).default("javascript"),
  prompt: z.string().max(4000).optional(),
  sessionId: z.string().cuid().optional(),
  personaId: z.string().cuid().optional(), // optional; must match session if provided
});

type ChatRow = {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  text: string | null;
  code: string | null;
  language: string | null;
};

function toInt(v: unknown) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : undefined;
}
function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function countAssistantTurns(history: { role: string }[]) {
  return history.filter((m) => m.role === "ASSISTANT").length;
}

function countUserPressure(history: { role: string; text?: string | null }[]) {
  const askRe =
    /\b(code|give.*solution|write.*function|final answer|full solution|implement|just.*solution)\b/i;
  return history.filter((m) => m.role === "USER" && askRe.test(m.text || "")).length;
}

function signatureFor(language: "javascript" | "python" | "cpp") {
  switch (language) {
    case "javascript":
      return `module.exports = function solution(/* args */) { /* implement */ }`;
    case "python":
      return `def solution(*args):\n    # implement\n    return None`;
    case "cpp":
      return `// Provide only a function body (no main). We'll integrate with a harness.`;
  }
}

function sanitizeCode(lang: "javascript" | "python" | "cpp", raw: string) {
  let s = (raw || "").trim();
  const m = s.match(/```(?:\w+)?\n([\s\S]*?)```/);
  if (m) s = m[1];
  s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  if (lang === "javascript" && /function\s+solution\s*\(/.test(s) && !/module\.exports\s*=/.test(s)) {
    s += "\n\nmodule.exports = solution;";
  }
  return s.trim();
}

function sanitizeMessage(raw: string, disallowPseudocode: boolean) {
  let s = (raw || "").trim();
  // strip code blocks
  s = s.replace(/```[\s\S]*?```/g, "[redacted code]");
  if (disallowPseudocode) {
    const lines = s.split(/\r?\n/);
    const suspicious = lines.filter((l) =>
      /\b(for|while|if|else|switch|case|return)\b|\{|\}|\(|\)|:/.test(l)
    );
    if (suspicious.length > 3) {
      s = lines.slice(0, 3).join("\n") + "\n[details withheld until unlock]";
    }
  }
  return s;
}

function degradeCode(language: "javascript" | "python" | "cpp", src: string): string {
  if (!src) return src;
  if (language === "javascript") {
    let out = src;
    if (!/module\.exports\s*=/.test(out) && /function\s+solution\s*\(/.test(out)) {
      out += "\n\nmodule.exports = solution;";
    }
    // Add subtle wrongness to avoid “full”
    out = out.replace(
      /(\{)\s*\n/,
      `$1\n  // TODO: fix logic\n  if (Array.isArray(arguments[0]) && arguments[0].length === 0) return null;\n`
    );
    out = out.replace(/===/g, "==");
    return out;
  }
  if (language === "python") {
    let out = src;
    out = out.replace(
      /def\s+solution\([^\)]*\):\s*\n/,
      (m) => m + "    # TODO: fix logic\n    if len(args) == 0:\n        return None\n"
    );
    return out;
  }
  if (language === "cpp") {
    return `// TODO: fix logic\n${src}\n// NOTE: missing some edge cases`;
  }
  return src;
}

type PersonaResolved = {
  personaRow: {
    id: string;
    key: string;
    name: string;
    systemPrompt: string;
    model: string | null;
    temperature: number | null;
    topP: number | null;
    maxOutputTokens: number | null;
    config: any | null;
  } | null;
  snapshot: {
    personaModel: string;
    personaTemperature: number;
    personaSystemPrompt: string;
    personaConfig: any | null;
  };
};

async function scoreDefenseIfNeeded(
  resolved: PersonaResolved,
  lastUserText: string
): Promise<number | null> {
  const cfg = (resolved.snapshot.personaConfig ?? {}) as any;
  if (!cfg?.requireUserDefense) return null;
  if (!lastUserText) return 0;

  const judge = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Score 0–10 how well the user JUSTIFIED their algorithmic approach. " +
          "Rubric: viable algorithm; key steps; time/space complexity; edge cases; trade-offs. " +
          "Return ONLY the number.",
      } as ChatCompletionSystemMessageParam,
      { role: "user", content: lastUserText } as ChatCompletionUserMessageParam,
    ],
  });

  const raw = judge.choices?.[0]?.message?.content?.trim() || "0";
  const n = Number(raw.replace(/[^\d\.]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0;
}

type CodeMode = "none" | "partial" | "full";

async function decideCodeMode(opts: {
  history: ChatRow[];
  userText: string;
  resolved: PersonaResolved;
}): Promise<CodeMode> {
  const { history, userText, resolved } = opts;
  const cfg = (resolved.snapshot.personaConfig ?? {}) as any;

  const writesByDefault = cfg?.writeCodeByDefault === true;
  const turns = countAssistantTurns(history);
  const pressure = countUserPressure(history.concat([{ role: "USER", text: userText } as any]));

   if (!writesByDefault && turns === 0) {
   return "none";
 }
  const partialAfterTurns = Number.isFinite(cfg?.partialAfterTurns)
    ? cfg.partialAfterTurns
    : writesByDefault
    ? 0
    : 2;
  const partialAfterPressure = Number.isFinite(cfg?.partialAfterPressure)
    ? cfg.partialAfterPressure
    : writesByDefault
    ? 0
    : 2;
  const fullAfterTurns = Number.isFinite(cfg?.fullAfterTurns)
    ? cfg.fullAfterTurns
    : writesByDefault
    ? 0
    : 3;
  const fullAfterPressure = Number.isFinite(cfg?.fullAfterPressure)
    ? cfg.fullAfterPressure
    : writesByDefault
    ? 0
    : 3;

  let scoreOK = true;
  const minDefenseScore = Number.isFinite(cfg?.minDefenseScore) ? cfg.minDefenseScore : null;
  if (cfg?.requireUserDefense && minDefenseScore != null) {
    const lastUserText = userText || (history.slice().reverse().find((m) => m.role === "USER")?.text ?? "");
    const score = await scoreDefenseIfNeeded(resolved, lastUserText);
    scoreOK = (score ?? 0) >= minDefenseScore;
  }

  if (writesByDefault) return "full";
  if (cfg?.writesFullSolutions === false) {
    const allowPartial =
      turns >= partialAfterTurns && pressure >= partialAfterPressure && (!cfg?.requireUserDefense || scoreOK);
    return allowPartial ? "partial" : "none";
  }

  const allowPartial = turns >= partialAfterTurns && pressure >= partialAfterPressure;
  const allowFull = turns >= fullAfterTurns && pressure >= fullAfterPressure && (!cfg?.requireUserDefense || scoreOK);

  if (allowFull) return "full";
  if (allowPartial) return "partial";
  return "none";
}

const QUIPS = {
  god_ceo: {
    none: [
      "That’s not a strategy—that’s a wish list.",
      "Confidence is not a substitute for an algorithm.",
      "Ambition noted; substance missing.",
    ],
    partial: [
      "Here’s your almost-solution; prove you can fix it.",
      "Close enough to be dangerous—go finish it.",
      "I’ll meet you halfway. The competent half is yours.",
    ],
    full: ["You squeaked past the bar. Don’t get comfortable."],
  },
  clueless_hr: {
    none: [
      "We can circle back on the... hash thingy?",
      "Love the synergy here! What's your comfort with, um, curly brackets?",
      "From a culture-fit lens, how do you vibe with arrays?",
    ],
    partial: [
      "I tried a 'map'—is that like a Google Map? Anyway, see below!",
      "I poked the code! If it screams, that’s normal.",
      "Hash map… does it store breakfast? I’m learning!",
    ],
    full: ["I think this works! If not, I can ask the… tech humans."],
  },
} as const;

function pickQuip(personaKey: string | undefined, mode: CodeMode) {
  const bank = personaKey && (QUIPS as any)[personaKey]?.[mode];
  if (!bank || !bank.length) return null;
  return bank[Math.floor(Math.random() * bank.length)];
}

function spiceMessage(personaKey: string | undefined, mode: CodeMode, msg: string) {
  const q = pickQuip(personaKey, mode);
  if (!q) return msg;
  const tag = msg.match(/^\s*\[[^\]]+\]\s*/)?.[0] ?? "";
  const body = tag ? msg.slice(tag.length) : msg;
  return `${tag}${q} ${body}`.trim();
}

// Helpers to build typed messages so TS is happy
const msgSystem = (content: string): ChatCompletionSystemMessageParam => ({ role: "system", content });
const msgUser = (content: string): ChatCompletionUserMessageParam => ({ role: "user", content });
const msgAssistant = (content: string): ChatCompletionAssistantMessageParam => ({
  role: "assistant",
  content,
});

// ---------- core resolution logic ----------

async function resolveSessionAndPersona(opts: {
  userId: number;
  problemId: number;
  sessionId?: string;
  personaId?: string;
}): Promise<{ sessionId: string; resolved: PersonaResolved }> {
  const { userId, problemId, sessionId, personaId } = opts;

  if (sessionId) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, problemId, participants: { some: { userId } } },
      select: {
        id: true,
        problemId: true,
        personaId: true,
        personaModel: true,
        personaTemperature: true,
        personaSystemPrompt: true,
        personaConfig: true,
      },
    });
    if (!session) throw new Error("Session not found, not yours, or mismatched problemId.");

    if (personaId && session.personaId && session.personaId !== personaId) {
      throw new Error("Persona mismatch: the session was created with a different persona. Start a new session.");
    }

    const personaRow = session.personaId
      ? await prisma.persona.findUnique({
          where: { id: session.personaId },
          select: {
            id: true,
            key: true,
            name: true,
            systemPrompt: true,
            model: true,
            temperature: true,
            topP: true,
            maxOutputTokens: true,
            config: true,
          },
        })
      : null;

    const snap: PersonaResolved["snapshot"] = {
      personaModel: session.personaModel || (personaRow?.model ?? "gpt-4o-mini"),
      personaTemperature:
        typeof session.personaTemperature === "number"
          ? session.personaTemperature
          : personaRow?.temperature ?? 0.4,
      personaSystemPrompt: session.personaSystemPrompt || (personaRow?.systemPrompt ?? "You are a helpful coding assistant."),
      personaConfig: session.personaConfig ?? personaRow?.config ?? null,
    };

    return { sessionId: session.id, resolved: { personaRow, snapshot: snap } };
  }

  // No session provided → pick persona (explicit > problem default), snapshot, and create NEW session (forceNew)
  let persona = null as PersonaResolved["personaRow"];
  if (personaId) {
    persona = await prisma.persona.findUnique({
      where: { id: personaId },
      select: {
        id: true,
        key: true,
        name: true,
        systemPrompt: true,
        model: true,
        temperature: true,
        topP: true,
        maxOutputTokens: true,
        config: true,
      },
    });
  }
  if (!persona) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { defaultPersonaId: true },
    });
    if (problem?.defaultPersonaId) {
      persona = await prisma.persona.findUnique({
        where: { id: problem.defaultPersonaId },
        select: {
          id: true,
          key: true,
          name: true,
          systemPrompt: true,
          model: true,
          temperature: true,
          topP: true,
          maxOutputTokens: true,
          config: true,
        },
      });
    }
  }

  const snapshot = {
    personaModel: persona?.model ?? "gpt-4o-mini",
    personaTemperature: persona?.temperature ?? 0.4,
    personaSystemPrompt: persona?.systemPrompt ?? "You are a helpful coding assistant.",
    personaConfig: persona?.config ?? null,
  };

  const newSessionId = await getOrCreateProblemSession(
    userId,
    problemId,
    persona?.id, // may be undefined
    snapshot,
    { forceNew: true } // ← never reuse → no bleed
  );

  return { sessionId: newSessionId, resolved: { personaRow: persona, snapshot } };
}

// ---------- routes ----------

// POST /api/ai/solve
router.post("/solve", async (req: Request, res: Response) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  const { problemId, language, prompt, sessionId, personaId } = parsed.data;
  const userId = (req as any).user?.id as number;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { id: true, title: true, description: true, difficulty: true, examples: true },
  });
  if (!problem) return res.status(404).json({ error: "Problem not found" });

  // Resolve session & persona (will auto-create fresh if sessionId missing)
  let sid: string;
  let resolved: PersonaResolved;
  try {
    const r = await resolveSessionAndPersona({ userId, problemId, sessionId, personaId });
    sid = r.sessionId;
    resolved = r.resolved;
  } catch (e: any) {
    return res.status(409).json({ error: e?.message || "Session/persona resolution failed" });
  }

  // Persist user message (if present)
  const userText = (prompt ?? "").trim();
  if (userText) {
    await prisma.chatMessage.create({
      data: { sessionId: sid, userId, role: "USER", text: userText },
    });
  }

  // Load chat history for this session only
  const history = (await prisma.chatMessage.findMany({
    where: { sessionId: sid },
    orderBy: { sentAt: "asc" },
    take: 50,
    select: { role: true, text: true, code: true, language: true },
  })) as ChatRow[];

  // Visible examples
  const visibleExamples = await prisma.testCase.findMany({
    where: { problemId, hidden: false },
    orderBy: { ordinal: "asc" },
    take: 2,
    select: { input: true, expected: true },
  });

  // Decide code mode with persona config
  const codeMode = await decideCodeMode({ history, userText, resolved });

  // Build a single authoritative system block (gate + persona)
  const sysGate = [
    "You are a coding assistant for a sandboxed judge.",
    'Output STRICT JSON with exactly: {"code": string, "message": string}.',
    `CODE_MODE=${codeMode}.`,
    "General:",
    "- Begin the message with the persona tag if defined (e.g., [HR], [CEO]).",
    "- Persona voice applies, but formatting rules override persona if there is a conflict.",
    "- Do not wrap code in backticks; raw source only in the JSON string.",
    "When CODE_MODE=none:",
    '- The value of "code" MUST be an empty string.',
    "- Ask exactly ONE persona-appropriate question to move the debate forward.",
    "- Give at most one tiny hint; do NOT outline the final algorithm.",
    "- If the user asks for code, refuse and restate the rule.",
    "When CODE_MODE=partial:",
    '- Provide intentionally incomplete or slightly buggy code in "code". Keep it short.',
    "- Include exactly 1–2 small issues (off-by-one, missing edge case, wrong var name, early return).",
    "- Do NOT give a full, clean solution.",
    "- Keep persona flavor.",
    "When CODE_MODE=full:",
    `- Provide a correct, complete implementation in ${language} matching the required signature, runnable in our harness.`,
  ].join(" ");

  const personaSystem = resolved.snapshot.personaSystemPrompt || "";
  const personaCfg = (resolved.snapshot.personaConfig ?? {}) as {
    writeCodeByDefault?: boolean;
    writesFullSolutions?: boolean;
    hintPolicy?: string;
    requireUserDefense?: boolean;
    disallowPseudocode?: boolean;
    topP?: number;
    maxOutputTokens?: number;
  };

  const systemBlock = [sysGate, personaSystem].filter(Boolean).join("\n\n");
  const signature = signatureFor(language);

  // Convert history to OpenAI messages.
  // IMPORTANT: downcast historical SYSTEM notes to 'assistant' text to avoid overriding persona
  const past: ChatCompletionMessageParam[] = history.map((m) => {
    if (m.role === "ASSISTANT") {
      const content =
        m.code && m.language
          ? `${m.text ?? ""}\n\n\`\`\`${m.language}\n${m.code}\n\`\`\``
          : m.text ?? "";
      return msgAssistant(content);
    }
    if (m.role === "USER") {
      return msgUser(m.text ?? "");
    }
    // SYSTEM history becomes assistant chatter
    return msgAssistant(`SYSTEM note: ${m.text ?? ""}`);
  });

  const problemCtx =
    `Problem: ${problem.title} [${problem.difficulty}]\n\n` +
    `${problem.description}\n\n` +
    `Language: ${language}\n` +
    `Required signature:\n${signature}\n\n` +
    `Visible examples:\n${JSON.stringify(visibleExamples, null, 2)}\n\n` +
    `Return ONLY a JSON object with fields {code, message}.`;

  const messages: ChatCompletionMessageParam[] = [
    msgSystem(systemBlock), // single, authoritative
    ...past,
    msgUser(problemCtx),
  ];

  if (userText) {
    messages.push(
      msgUser(
        `User instruction:\n${userText}\n\nTailor "message" to THIS instruction (not a restatement of the problem).`
      )
    );
    if (/\b(no code|explain only|explanation only|hint only)\b/i.test(userText)) {
      messages.unshift(msgSystem('User requested explanation only; set "code" to an empty string.'));
    }
  }

  try {
    const baseTemp = resolved.snapshot.personaTemperature ?? 0.4;
    const turns = countAssistantTurns(history);
    const pressure = countUserPressure(history);
    const turnTemp =
      codeMode === "full"
        ? baseTemp
        : Math.min(1.0, baseTemp + 0.15 + 0.05 * Math.min(4, Math.max(turns, pressure)));

    const completion = await client.chat.completions.create({
      model: resolved.snapshot.personaModel || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages,
      temperature: turnTemp,
      top_p: toNum(resolved.personaRow?.topP) ?? undefined,
      max_tokens: toInt(resolved.personaRow?.maxOutputTokens) ?? undefined,
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let parsedOut: any = {};
    try {
      parsedOut = JSON.parse(raw);
    } catch {
      parsedOut = {};
    }

    const cfg = (resolved.snapshot.personaConfig ?? {}) as any;

    let code = sanitizeCode(language, parsedOut.code ?? "");
    let message = typeof parsedOut.message === "string" ? parsedOut.message : "";

    // Enforce server gates
    if (codeMode === "none") {
      code = "";
      message = sanitizeMessage(message, !!cfg?.disallowPseudocode);
    } else if (codeMode === "partial") {
      if (!code) {
        if (language === "javascript") {
          code = `function solution(/* args */){ /* TODO: implement */ return null; }\nmodule.exports = solution;`;
        } else if (language === "python") {
          code = `def solution(*args):\n    # TODO: implement\n    return None\n`;
        } else if (language === "cpp") {
          code = `/* TODO: implement */`;
        }
      }
      code = degradeCode(language, code);
    } else {
      if (!code) return res.status(502).json({ error: "AI returned no code" });
    }

    // Ensure JS export for full mode
    if (
      codeMode === "full" &&
      code &&
      language === "javascript" &&
      /function\s+solution\s*\(/.test(code) &&
      !/module\.exports\s*=/.test(code)
    ) {
      code += "\n\nmodule.exports = solution;";
    }

    // Save assistant message
    const assistantMsg = await prisma.chatMessage.create({
      data: {
        sessionId: sid,
        role: "ASSISTANT",
        text: message || (code ? "Draft solution inserted into the editor." : "Hint provided."),
        code: code || null,
        language: code ? language : null,
      },
      select: { id: true, role: true, text: true, code: true, language: true, sentAt: true },
    });

    // Persona quip flavor
    const flavored = spiceMessage(resolved.personaRow?.key, codeMode, message);

    return res.json({ codeMode, code, message: flavored, sessionId: sid, assistantMessage: assistantMsg });
  } catch (e: any) {
    console.error("[AI] error:", e?.message || e);
    return res.status(500).json({ error: "AI call failed" });
  }
});

// GET /api/ai/history?problemId=1&sessionId=abc (preferred) OR &personaId=xyz (fallback)
router.get("/history", async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as number;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
    const problemId = Number(req.query.problemId);
    if (!Number.isFinite(problemId)) return res.status(400).json({ error: "Bad problemId" });
  
    const sessionIdQ = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
    const personaIdQ = typeof req.query.personaId === "string" ? req.query.personaId : undefined;
  
    const session = sessionIdQ
      ? await prisma.session.findFirst({
          where: { id: sessionIdQ, participants: { some: { userId } } },
          select: { id: true },
        })
      : await prisma.session.findFirst({
          where: {
            problemId,
            status: "active",
            participants: { some: { userId } },
            ...(personaIdQ ? { personaId: personaIdQ } : { personaId: { equals: null } }),
          },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });
  
    if (!session) return res.json({ sessionId: null, messages: [] });
  
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { sentAt: "asc" },
      select: { id: true, role: true, text: true, code: true, language: true, sentAt: true },
    });
  
    res.json({ sessionId: session.id, messages });
  });
export default router;
