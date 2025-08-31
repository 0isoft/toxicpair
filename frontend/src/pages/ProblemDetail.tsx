import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { useApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Problem, Attempt } from "../lib/types";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { EditorView } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSessionTimer } from "../hooks/useSessionTimer";

type AiSolveResult = { code: string; message: string };


function gateSubtitle(p: ProblemWithRules) {
    const bits: string[] = [];
  
    if (p.editorMode === "VIBECODE") {
      bits.push("In vibe-code mode, your editor is locked. Only your pair programmer can write code and you must guide them in chat.");
    }
    if (p.timeLimitSeconds && p.timeLimitSeconds > 0) {
      bits.push("The timer starts counting down when you select.");
    }
  
    const intro = "Pick a character to begin, choose wisely!";
    return bits.length ? `${intro} ${bits.join(" ")}` : intro;
  }

function TabButton({
    active, onClick, children
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button role="tab" aria-selected={active} onClick={onClick} className="tab">
            {children}
        </button>
    );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`card ${className}`}>{children}</div>;
}

type PersonaLite = {
    id: string;
    key: string;
    name: string;
    tagline?: string | null;
    avatarEmoji?: string | null;
    isDefault?: boolean;
};
type PersonasResp = {
    defaultPersonaId: string | null;
    personas: PersonaLite[];
};

type HistoryResp = {
    sessionId: string | null;
    messages: Array<{
        id: number;
        role: "USER" | "ASSISTANT" | "SYSTEM";
        text: string | null;
        code: string | null;
        language: string | null;
        sentAt: string;
    }>;
};

type ProblemWithRules = Problem & {
    editorMode?: "CODE" | "VIBECODE" | null;
    timeLimitSeconds?: number | null;
};

function langStub(lang: string) {
    switch (lang) {
        case "javascript":
        case "js":
            return `// Export a function named "solution"
module.exports = function solution(/* args */) {
  // TODO: implement
  return null;
};`;
        case "python":
            return `# Define a function named "solution"
def solution(*args):
    # TODO: implement
    return None`;
        case "cpp":
            return `#include <bits/stdc++.h>
using namespace std;
// Expect JSON on argv[1], print JSON on stdout
int main(int argc, char** argv) {
  // TODO: parse argv[1] if needed and print a JSON result
  cout << "null";
  return 0;
}`;
        default:
            return "";
    }
}

function langExtension(lang: "javascript" | "python" | "cpp") {
    switch (lang) {
        case "javascript":
            return javascript({ jsx: true, typescript: true });
        case "python":
            return python();
        case "cpp":
            return cpp();
    }
}

const transparentBg = EditorView.theme(
    { "&": { backgroundColor: "transparent" } },
    { dark: false }
);

function Difficulty({ value }: { value?: string }) {
    const v = (value || "").toLowerCase();
    let cls = "badge";
    if (v === "easy") cls += " easy";
    else if (v === "medium") cls += " medium";
    else if (v === "hard") cls += " hard";
    return <span className={cls}>{value ?? "-"}</span>;
}

function normalizeAiCode(language: "javascript" | "python" | "cpp", raw: string) {
    let s = (raw || "").trim();
    const fence = s.match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (fence) s = fence[1];
    s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    if (language === "javascript") {
        if (/function\s+solution\s*\(/.test(s) && !/module\.exports\s*=/.test(s)) {
            s += "\n\nmodule.exports = solution;";
        }
    }
    return s.trim();
}

function formatMMSS(total: number) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function CountdownRing({
    total,
    remaining,
}: { total: number; remaining: number }) {
    // clamp
    const r = Math.max(0, Math.min(remaining, total));
    const pct = total > 0 ? r / total : 0;
    const deg = Math.round(360 * pct);
    const danger = r <= 60;

    return (
        <div className={`timerWrap ${danger ? "danger" : ""}`} style={{ ["--deg" as any]: `${deg}deg` }}>
            <div className="timerRing" />
            <div className="timerText">{formatMMSS(Math.floor(r))}</div>
        </div>
    );
}

function AttemptRow({
    attempt,
    defaultOpen = false,
}: {
    attempt: Attempt;
    defaultOpen?: boolean;
}) {
    const api = useApi();
    const [open, setOpen] = useState(defaultOpen);

    const detailQ = useQuery({
        queryKey: ["attemptDetail", attempt.id],
        queryFn: () => api<{ logs?: string; errorMessage?: string }>(`/attempts/${attempt.id}`),
        enabled: open,
        staleTime: 60_000,
    });

    return (
        <li className="attempt">
            <div className="attemptHeader">
                <div>
                    <div style={{ fontWeight: 600 }}>{attempt.status}</div>
                    <div className="muted" style={{ marginTop: 2 }}>
                        {attempt.language} • {attempt.passedCount}/{attempt.totalCount} • {attempt.runtimeMs ?? 0} ms
                    </div>
                </div>

                <div className="muted">
                    {new Date(attempt.submittedAt).toLocaleString()}
                </div>
            </div>

            <div className="attemptActions">
                <button
                    className="btn"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls={`logs-${attempt.id}`}
                >
                    {open ? "Hide logs" : "View logs"}
                </button>
            </div>

            {open && (
                <div id={`logs-${attempt.id}`} className="logBox">
                    {detailQ.isLoading && <p className="muted">Loading logs…</p>}

                    {!detailQ.isLoading && !detailQ.data?.logs && !detailQ.data?.errorMessage && (
                        <p className="muted" style={{ margin: 0 }}>No logs for this attempt.</p>
                    )}

                    {detailQ.data?.errorMessage && (
                        <div className="logError">{detailQ.data.errorMessage}</div>
                    )}

                    {detailQ.data?.logs && (
                        <pre className="logPre">{detailQ.data.logs}</pre>
                    )}
                </div>
            )}
        </li>
    );
}

export default function ProblemDetail() {
    const { id } = useParams();
    const api = useApi();
    const { token } = useAuth();
    const qc = useQueryClient();
    const [tab, setTab] = useState<"desc" | "subs">("desc");

    const didCompleteRef = useRef(false);
    const didExpireRef = useRef(false);

    const { data: problem, isLoading, error } = useQuery({
        queryKey: ["problem", id],
        queryFn: () => api<ProblemWithRules>(`/problems/${id}`),
        enabled: !!id,
    });

    const attemptsQ = useQuery<Attempt[]>({
        queryKey: ["attempts", id],
        queryFn: () => api<Attempt[]>(`/attempts?problemId=${id}`),
        enabled: !!token && !!id,
        refetchInterval: (q) => {
            const latest = (q.state.data as Attempt[] | undefined)?.[0];
            const s = latest?.status;
            return s === "SUBMITTED" || s === "RUNNING" ? 1000 : false;
        },
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    const attempts = attemptsQ.data;
    const loadingAttempts = attemptsQ.isLoading;
    const latest = useMemo<Attempt | null>(() => attempts?.[0] ?? null, [attempts]);

    const [language, setLanguage] = useState<"javascript" | "python" | "cpp">("javascript");
    const [code, setCode] = useState<string>(() => langStub("javascript"));
    const [note, setNote] = useState<string | null>(null);

    const [ask, setAsk] = useState("");
    const [aiMessage, setAiMessage] = useState<string>("");
    const [lastLogs, setLastLogs] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);

    function onChangeLanguage(next: "javascript" | "python" | "cpp") {
        setLanguage(next);
        setCode((prev) => (prev.trim() ? prev : langStub(next)));
    }

    // ===== Personas (gate) =====
    const personasQ = useQuery({
        queryKey: ["personas", id],
        queryFn: () => api<PersonasResp>(`/problems/${id}/personas`),
        enabled: !!id,
    });

    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
    useEffect(() => {
        if (personasQ.data && !selectedPersonaId) {
            setSelectedPersonaId(personasQ.data.defaultPersonaId || personasQ.data.personas[0]?.id || null);
        }
    }, [personasQ.data, selectedPersonaId]);

    type StartResp = {
        sessionId: string;
        attemptId: number;
        editorMode: "CODE" | "VIBECODE";
        deadlineAt: string | null;
        timeLimitSeconds: number | null;
    };
    const [session, setSession] = useState<StartResp | null>(null);
    const showGate = !session;

    useEffect(() => {
        // new problem → clear session & chat & persona
        setSession(null);
        setSelectedPersonaId(null);
        setChat([]);
        setNote(null);
    }, [id]);

    async function startWithPersona(pid: string) {
        if (!id) return;
        const r = await api<StartResp>("/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problemId: Number(id), personaId: pid, forceNew: true }), // <— add forceNew
        });
        setSession(r);
        setSelectedPersonaId(pid);
        setChat([]); // brand new chat for brand new session
    }

    const { editorMode, remainingSeconds } = useSessionTimer(session?.sessionId);
    const readOnly = editorMode === "VIBECODE";

    useEffect(() => {
        if (!session?.sessionId) return;
      
        // only expire if not solved
        if (remainingSeconds === 0 && latest?.status !== "PASSED" && !didExpireRef.current) {
          didExpireRef.current = true;
          api(`/sessions/${session.sessionId}/expire`, { method: "POST" }).catch(() => {});
          setChat([]);
          setNote(" time’s up better luck next time!");
        }
      }, [remainingSeconds, latest?.status, session?.sessionId, api]);
    useEffect(() => {
        if (!session?.sessionId) return;
        if (latest?.status === "PASSED" && !didCompleteRef.current) {
          didCompleteRef.current = true;
          // stop the expire path
          didExpireRef.current = true;
      
          // (optional) tell server to end session (idempotent)
          api(`/sessions/${session.sessionId}/complete`, { method: "POST" }).catch(() => {});
      
          // show success banner
          setNote("gg, you passed! timer stopped; you can head back whenever.");
        }
      }, [latest?.status, session?.sessionId, api]);

    // ===== Attempts (submit) =====
    const submit = useMutation({
        mutationFn: async () => {
            const body = { problemId: Number(id), language, code, sessionId: session?.sessionId };
            return api<Attempt>("/attempts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        },
        onMutate: () => {
            setTab("subs");
            setNote(null);
            setLastLogs(null);
            setLastError(null);
        },
        onSuccess: async (summary) => {
            setNote(
                `Submitted: ${summary.status} (${summary.passedCount}/${summary.totalCount}) in ${summary.runtimeMs ?? 0} ms`
            );
            qc.invalidateQueries({ queryKey: ["attempts", id] });
            try {
                const detail = await api<{ logs?: string; errorMessage?: string }>(`/attempts/${summary.id}`);
                if (detail?.logs) {
                    setLastLogs(detail.logs);
                    setNote((prev) => (prev ? prev + " — see logs below" : "See logs below"));
                }
                if (detail?.errorMessage) setLastError(detail.errorMessage);
            } catch {
                setLastError("Failed to load attempt details");
            }
        },
        onError: (err: any) => setNote(err?.message || "Submission failed"),
    });

    // ===== Chat / AI =====
    type ChatMsg = {
        id: number | string;
        role: "USER" | "ASSISTANT" | "SYSTEM";
        text: string;
        code?: string | null;
        language?: "javascript" | "python" | "cpp" | null;
        sentAt?: string;
    };

    const [chat, setChat] = useState<ChatMsg[]>([]);
    const endRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [chat.length]);

    const currentPersona = useMemo(
        () => (personasQ.data?.personas ?? []).find(p => p.id === selectedPersonaId) ?? null,
        [personasQ.data, selectedPersonaId]
    );
    const personaDisplay =
        currentPersona
            ? `${currentPersona.avatarEmoji ? currentPersona.avatarEmoji + " " : ""}${currentPersona.name}`
            : "Assistant";

    type AskVars = { prompt: string };
    const askAi = useMutation({
        mutationFn: async (vars: AskVars) => {
            if (!session?.sessionId) {
                throw new Error("No active session; pick a persona first.");
              }
            const body = {
                problemId: Number(id),
                language,
                prompt: vars.prompt || undefined,
                sessionId: session.sessionId, 
                personaId: selectedPersonaId || undefined,
            };
            return api<AiSolveResult & { sessionId?: string; assistantMessage?: ChatMsg }>(
                "/ai/solve",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                }
            );
        },
        onMutate: (vars: AskVars) => {
            const my = (vars.prompt || "").trim();
            if (my) {
                setChat((c) => [...c, { id: `tmp-${Date.now()}`, role: "USER", text: my }]);
            }
            setAsk("");
        },
        onSuccess: (res) => {
            if (res?.code) setCode(normalizeAiCode(language, res.code));
            if (res?.assistantMessage) setChat((c) => [...c, res.assistantMessage!]);
        },
        onError: () => {
            setChat((c) => [...c, { id: `err-${Date.now()}`, role: "SYSTEM", text: "AI request failed." }]);
        },
    });

    // Gate persona card
    function PersonaCard({ p, onPick }: { p: PersonaLite; onPick: (id: string) => void }) {
        return (
          <button onClick={() => onPick(p.id)} className="personaCard personaCard--big" title={p.tagline ?? ""}>
            <div className="personaAvatar personaAvatar--big">{p.avatarEmoji ?? "🤖"}</div>
            <div className="personaMeta personaMeta--center">
              <div className="personaName personaName--big">
                {p.name}{p.isDefault ? " • default" : ""}
              </div>
              {p.tagline && <div className="personaTagline personaTagline--big">{p.tagline}</div>}
            </div>
          </button>
        );
      }

    return (
        <main className="page">
            <style>{`
  :root { --brand: #3778ff; --bg: #f6f7fb; --text: #111827; --muted: #6b7280; --border: #e5e7eb; }
  .page { min-height: 100vh; background: var(--bg); }
  .container { max-width: min(96vw, 1500px); margin: 0 auto; padding: 24px; color: var(--text); }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    gap: 16px;
    align-items: stretch;
  }

  .gateWrap { display:flex; flex-direction:column; height:100%; }
  .gateInfo { padding: 12px; border-bottom:1px solid var(--border); background:#f8fafc; }
  .gateBody { padding: 16px; overflow:auto; }
  .gateHero {
    padding: 24px 28px;
    background: radial-gradient(120% 120% at 0% 0%, #eaf1ff 0%, #ffffff 40%) ;
    border-bottom: 1px solid var(--border);
  }
  
  .gateHeroRow {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  
  /* Big, banner-like labels */
  .modeTitle,
  .timeTitle {
    font-weight: 900;
    letter-spacing: .5px;
    text-transform: uppercase;
    padding: 10px 14px;
    border-radius: 12px;
    background: #111827;          /* dark banner */
    color: #fff;
    box-shadow: 0 2px 0 rgba(0,0,0,0.12);
    font-size: 14px;
  }
  
  .timeTitle { background: var(--brand); }
  
  .gateSub {
    font-size: 15px;
    margin-top: 4px;
    color: #1f2937;
  }
  .gateSub.strong { font-weight: 700; }
  
  .gateBody--big { padding-top: 8px; }
  .gateHeading {
    margin: 10px 0 16px;
    font-size: 20px;
    font-weight: 800;
  }
  
  /* --- Big, square persona cards --- */
  .personaGrid--big {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
  
  .personaCard--big {
    aspect-ratio: 1 / 1;            /* square */
    min-height: 220px;              /* keeps it big even if grid shrinks */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
  
    border: 2px solid var(--border);
    border-radius: 16px;
    background: #fff;
    transition: transform .08s ease, box-shadow .15s ease, border-color .15s ease;
  }
  
  .personaCard--big:hover {
    transform: translateY(-2px);
    border-color: var(--brand);
    box-shadow: 0 6px 20px rgba(55,120,255,0.12);
  }
  
  .personaAvatar--big { font-size: 44px; line-height: 1; }
  .personaMeta--center { text-align: center; }
  
  .personaName--big {
    font-weight: 900;
    font-size: 16px;
  }
  
  .personaTagline--big {
    font-size: 12px;
    color: var(--muted);
    max-width: 18ch;
  }
  .timer { font-variant-numeric: tabular-nums; font-weight:600; }

  .grid > aside,
  .grid > section { display: flex; min-height: 0; }

  :root { --sticky-top: 24px; --container-vpad: 48px; }
  /* Countdown ring */
  .timerWrap {
    position: relative;
    width: 44px;
    height: 44px;
    margin-left: 8px;
  }
  .timerRing {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(var(--brand) var(--deg), #e5e7eb 0);
  }
  .timerRing::after {
    content: "";
    position: absolute;
    inset: 6px;               /* inner cutout */
    background: #fff;
    border-radius: 50%;
  }
  .timerText {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 11px;
  }
  .timerWrap.danger .timerRing {
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.06); }
  }
  .sticky {
    position: sticky;
    top: var(--sticky-top);
    align-self: start;
    height: calc(80vh - var(--sticky-top) - var(--container-vpad));
    overflow: hidden;
  }
  .sticky > .card {
    flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
  }

  .leftContent { overflow: auto; }
  .section-grow { overflow: hidden; }
  .section-grow > .cm-editor { height: 100%; }
  .cm-scroller { height: 100%; overflow: auto; }
  .chatList { overflow: auto; }

  @media (max-width: 640px) {
    .sticky { position: static; max-height: none; }
  }
  @media (max-width: 991px) {
    .grid > aside:last-of-type { position: static; height: auto; overflow: visible; }
  }

  .card {
    background: #fff; border: 1px solid var(--border); border-radius: 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    overflow: hidden; display: flex; flex-direction: column; min-height: 0;
  }
  .cardHeader { padding: 8px 12px; border-bottom: 1px solid var(--border); background: #f8fafc; flex: 0 0 auto; }
  .section { padding: 16px; min-width: 0; }
  .section-grow { flex: 1 1 auto; min-height: 0; overflow: hidden; padding-top: 0; }
  .section-grow { display: flex; flex: 1 1 auto; min-height: 0; overflow: hidden; }
  .section-grow > .cm-editor { flex: 1 1 auto; min-width: 0; height: 100%; }
  .cm-scroller { overflow-y: auto; overflow-x: auto; height: 100%; }

  .chatList { display: flex; flex-direction: column; gap: 8px; height: 100%; overflow-y: auto; min-width: 0; padding-right: 4px; }
  .chatMsg { word-break: break-word; min-width: 0; }

  .tablist { display: flex; border-bottom: 1px solid var(--border); background: #f8fafc; }
  .tab { flex: 1; padding: 8px 12px; font-size: 14px; font-weight: 600; border: 0; background: transparent; border-bottom: 2px solid transparent; cursor: pointer; }
  .tab[aria-selected="true"] { border-bottom-color: #111827; background: #fff; }
  .row { display: flex; align-items: center; gap: 8px; }
  .spacer { flex: 1; }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 14px; font-weight: 600; border-radius: 10px; border: 0; cursor: pointer; }
  .btnPrimary { background: var(--brand); color: #fff; }
  .btnPrimary:disabled { opacity: .7; cursor: default; }
  .input, select, textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; font-size: 14px; }
  textarea.code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; height: 100%; width: 100%; }
  .muted { color: var(--muted); font-size: 12px; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 6px; font-size: 12px; font-weight: 600; background: #e5e7eb; color: #374151; }
  .badge.easy { background: #d1fae5; color: #065f46; }
  .badge.medium { background: #fef3c7; color: #92400e; }
  .badge.hard { background: #fee2e2; color: #b91c1c; }
  .list { list-style: none; padding: 0; margin: 0; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
  .list li { padding: 10px 12px; display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid var(--border); }
  .list li:first-child { border-top: 0; }
  .prose { line-height: 1.65; }
  .prose pre { background: #0b0b0b; color: #f5f5f5; padding: 12px; border-radius: 10px; overflow: auto; }
`}</style>  
            {note && (
  <div
    role="alert"
    style={{
      marginBottom: 12,
      padding: "10px 12px",
      borderRadius: 10,
      fontWeight: 600,
      background: note.toLowerCase().includes("gg")
        ? "#dcfce7"  // green
        : "#fee2e2", // red
      color: note.toLowerCase().includes("gg") ? "#065f46" : "#7f1d1d",
      border: "1px solid rgba(0,0,0,0.06)",
    }}
  >
    {note}
  </div>
)}

            <div className="container">
                {isLoading && <p>Loading…</p>}
                {error && <p style={{ color: "#b91c1c" }}>Failed to load problem.</p>}

                {problem && (
                    <div className="grid">
                        {/* LEFT PANE */}
                        <aside className="sticky">
                            <Card className="card-col">
                                <div role="tablist" className="tablist">
                                    <TabButton active={tab === "desc"} onClick={() => setTab("desc")}>Description</TabButton>
                                    <TabButton active={tab === "subs"} onClick={() => setTab("subs")}>Submissions</TabButton>
                                </div>

                                <div className="leftContent">
                                    {tab === "desc" && (
                                        <div>
                                            <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                                                <div>
                                                    <h1 style={{ margin: 0, fontSize: 22 }}>{problem.title}</h1>
                                                    <div style={{ marginTop: 4 }}><Difficulty value={problem.difficulty} /></div>
                                                </div>
                                            </div>

                                            {problem.description && (
                                                <section style={{ marginTop: 12 }}>
                                                    <h3 style={{ margin: "8px 0", fontSize: 14 }}>Problem</h3>
                                                    <div className="prose max-w-none">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {problem.description}
                                                        </ReactMarkdown>
                                                    </div>
                                                </section>
                                            )}

                                            {problem.examples && (
                                                <section style={{ marginTop: 12 }}>
                                                    <h3 style={{ margin: "8px 0", fontSize: 14 }}>Examples</h3>
                                                    <pre>{JSON.stringify(problem.examples, null, 2)}</pre>
                                                </section>
                                            )}
                                        </div>
                                    )}

                                    {tab === "subs" && (
                                        <div>
                                            {!token && <p className="muted">Log in to see your submissions.</p>}
                                            {token && loadingAttempts && <p>Loading attempts…</p>}
                                            {token && attempts && attempts.length === 0 && <p className="muted">No attempts yet.</p>}
                                            {token && attempts && attempts.length > 0 && (
                                                <ul className="list">
                                                    <ul className="list">
                                                        {attempts.map((a, idx) => (
                                                            <AttemptRow key={a.id} attempt={a} defaultOpen={idx === 0} />
                                                        ))}
                                                    </ul>
                                                </ul>
                                            )}

                                            {(lastError || lastLogs) && (
                                                <details style={{ marginTop: 12 }}>
                                                    <summary className="muted" style={{ cursor: "pointer" }}>View runner logs</summary>
                                                    {lastError && <div style={{ color: "#b91c1c", fontSize: 12, margin: "8px 0" }}>{lastError}</div>}
                                                    {lastLogs && <pre style={{ whiteSpace: "pre-wrap" }}>{lastLogs}</pre>}
                                                </details>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </aside>

                        {showGate ? (
                            // GATE spans middle + right
                            <section className="sticky" style={{ gridColumn: "span 2" }}>
  <div className="card gateWrap">
    <div className="gateHero">
      <div className="gateHeroRow">
        <div className="modeTitle">
          {problem.editorMode === "VIBECODE" ? "VIBE-CODE ONLY" : "FREE EDIT MODE"}
        </div>
        <div className="timeTitle">
          {problem.timeLimitSeconds ? `TIME LIMIT — ${formatMMSS(problem.timeLimitSeconds)}` : "NO TIME LIMIT"}
        </div>
      </div>

      <div className="gateSub">{gateSubtitle(problem)}</div>

    </div>

    <div className="gateBody gateBody--big">
      <h2 className="gateHeading">Choose your pair programming partner</h2>
      {personasQ.isLoading && <p className="muted">Loading personas…</p>}
      <div className="personaGrid personaGrid--big">
        {(personasQ.data?.personas ?? []).map((p) => (
          <PersonaCard key={p.id} p={p} onPick={startWithPersona} />
        ))}
      </div>
    </div>
  </div>
</section>
                        ) : (
                            <>
                                {/* MIDDLE (Editor) */}
                                <section className="sticky">
                                    <div className="card card-col">
                                        <div className="cardHeader">
                                            <div className="row">
                                                <label style={{ fontSize: 14 }}>Language</label>
                                                <select
                                                    value={language}
                                                    onChange={(e) => onChangeLanguage(e.target.value as any)}
                                                    style={{ width: 160 }}
                                                >
                                                    <option value="javascript">JavaScript</option>
                                                    <option value="python">Python</option>
                                                    <option value="cpp">C++</option>
                                                </select>

                                                <div className="spacer" />
                                                {remainingSeconds != null && (
                                                    <span className="timer">
                                                        ⏳ {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => submit.mutate()}
                                                    disabled={submit.isPending || remainingSeconds === 0}
                                                    className="btn btnPrimary"
                                                >
                                                    {submit.isPending ? "Running…" : "Run tests"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="section section-grow" style={{ paddingTop: 0 }}>
                                            <CodeMirror
                                                value={code}
                                                onChange={setCode}
                                                height="100%"
                                                style={{ width: "100%" }}
                                                extensions={[langExtension(language), transparentBg]}
                                                basicSetup={{
                                                    lineNumbers: true,
                                                    highlightActiveLine: true,
                                                    autocompletion: true,
                                                    foldGutter: true,
                                                    bracketMatching: true,
                                                    closeBrackets: true,
                                                }}
                                                placeholder="Write your solution here…"
                                                editable={!readOnly}
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* RIGHT (Assistant) */}
                                <aside className="sticky">
                                    <div className="card card-col">
                                        <div className="cardHeader">
                                            <div className="row" style={{ alignItems: "center" }}>
                                                <h4 style={{ margin: 0, fontSize: 14 }}>
                                                    {(currentPersona?.avatarEmoji ?? "🤖") + " "}{currentPersona?.name ?? "Assistant"}
                                                </h4>
                                                <div className="spacer" />
                                            </div>
                                            
                                        </div>

                                        <div className="section section-grow" style={{ paddingTop: 0 }}>
                                            <div className="chatList">
                                                {chat.length === 0 && (
                                                    <p className="muted">
                                                        Ask for a hint, complexity target, or a full draft solution. Returned code goes to the editor above.
                                                    </p>
                                                )}

                                                {chat.map((m) => {
                                                    const rawText = m.text || "";
                                                    const tagMatch = rawText.match(/^\s*\[(.*?)\]\s*/);
                                                    const cleanText = tagMatch ? rawText.slice(tagMatch[0].length) : rawText;

                                                    return (
                                                        <div key={m.id} className={`chatMsg ${m.role.toLowerCase()}`}>
                                                            <div className="muted" style={{ fontSize: 12, marginBottom: 4, display: "flex", gap: 8, alignItems: "center" }}>
                                                                <span style={{ fontWeight: 600 }}>
                                                                    {m.role === "USER"
                                                                        ? "You"
                                                                        : m.role === "ASSISTANT"
                                                                            ? ((currentPersona?.avatarEmoji ? `${currentPersona.avatarEmoji} ` : "") + (currentPersona?.name ?? "Assistant"))
                                                                            : "System"}
                                                                </span>
                                                                {m.sentAt ? <span>• {new Date(m.sentAt).toLocaleString()}</span> : null}
                                                            </div>

                                                            {m.text && <div style={{ whiteSpace: "pre-wrap" }}>{cleanText}</div>}

                                                            {m.role === "ASSISTANT" && m.code && (
                                                                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                                                                    (Code inserted into editor)
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                <div ref={endRef} />
                                            </div>
                                        </div>

                                        <div className="section" style={{ borderTop: `1px solid var(--border)` }}>
                                            <div className="row" style={{ alignItems: "flex-start" }}>
                                                <textarea
                                                    value={ask}
                                                    onChange={(e) => setAsk(e.target.value)}
                                                    rows={2}
                                                    className="input"
                                                    placeholder='e.g. "O(n) two-pointer version + explanation"'
                                                />
                                                <button
                                                    onClick={() => askAi.mutate({ prompt: ask })}
                                                    disabled={askAi.isPending || !ask.trim() || remainingSeconds === 0}
                                                    className="btn btnPrimary"
                                                >
                                                    {askAi.isPending ? "Sending…" : "Ask AI"}
                                                </button>
                                            </div>
                                            {askAi.error && (
                                                <p style={{ color: "#b91c1c", fontSize: 12, marginTop: 8 }}>AI request failed.</p>
                                            )}
                                        </div>
                                    </div>
                                </aside>
                            </>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
