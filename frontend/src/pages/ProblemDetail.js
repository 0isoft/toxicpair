import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { useApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { EditorView } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSessionTimer } from "../hooks/useSessionTimer";
function gateSubtitle(p) {
    const bits = [];
    if (p.editorMode === "VIBECODE") {
        bits.push("In vibe-code mode, your editor is locked. Only your pair programmer can write code and you must guide them in chat.");
    }
    if (p.timeLimitSeconds && p.timeLimitSeconds > 0) {
        bits.push("The timer starts counting down when you select.");
    }
    const intro = "Pick a character to begin, choose wisely!";
    return bits.length ? `${intro} ${bits.join(" ")}` : intro;
}
function TabButton({ active, onClick, children }) {
    return (_jsx("button", { role: "tab", "aria-selected": active, onClick: onClick, className: "tab", children: children }));
}
function Card({ children, className = "" }) {
    return _jsx("div", { className: `card ${className}`, children: children });
}
function langStub(lang) {
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
function langExtension(lang) {
    switch (lang) {
        case "javascript":
            return javascript({ jsx: true, typescript: true });
        case "python":
            return python();
        case "cpp":
            return cpp();
    }
}
const transparentBg = EditorView.theme({ "&": { backgroundColor: "transparent" } }, { dark: false });
function Difficulty({ value }) {
    const v = (value || "").toLowerCase();
    let cls = "badge";
    if (v === "easy")
        cls += " easy";
    else if (v === "medium")
        cls += " medium";
    else if (v === "hard")
        cls += " hard";
    return _jsx("span", { className: cls, children: value ?? "-" });
}
function normalizeAiCode(language, raw) {
    let s = (raw || "").trim();
    const fence = s.match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (fence)
        s = fence[1];
    s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    if (language === "javascript") {
        if (/function\s+solution\s*\(/.test(s) && !/module\.exports\s*=/.test(s)) {
            s += "\n\nmodule.exports = solution;";
        }
    }
    return s.trim();
}
function formatMMSS(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}
function CountdownRing({ total, remaining, }) {
    // clamp
    const r = Math.max(0, Math.min(remaining, total));
    const pct = total > 0 ? r / total : 0;
    const deg = Math.round(360 * pct);
    const danger = r <= 60;
    return (_jsxs("div", { className: `timerWrap ${danger ? "danger" : ""}`, style: { ["--deg"]: `${deg}deg` }, children: [_jsx("div", { className: "timerRing" }), _jsx("div", { className: "timerText", children: formatMMSS(Math.floor(r)) })] }));
}
function AttemptRow({ attempt, defaultOpen = false, }) {
    const api = useApi();
    const [open, setOpen] = useState(defaultOpen);
    const detailQ = useQuery({
        queryKey: ["attemptDetail", attempt.id],
        queryFn: () => api(`/attempts/${attempt.id}`),
        enabled: open,
        staleTime: 60_000,
    });
    return (_jsxs("li", { className: "attempt", children: [_jsxs("div", { className: "attemptHeader", children: [_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: attempt.status }), _jsxs("div", { className: "muted", style: { marginTop: 2 }, children: [attempt.language, " \u2022 ", attempt.passedCount, "/", attempt.totalCount, " \u2022 ", attempt.runtimeMs ?? 0, " ms"] })] }), _jsx("div", { className: "muted", children: new Date(attempt.submittedAt).toLocaleString() })] }), _jsx("div", { className: "attemptActions", children: _jsx("button", { className: "btn", onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-controls": `logs-${attempt.id}`, children: open ? "Hide logs" : "View logs" }) }), open && (_jsxs("div", { id: `logs-${attempt.id}`, className: "logBox", children: [detailQ.isLoading && _jsx("p", { className: "muted", children: "Loading logs\u2026" }), !detailQ.isLoading && !detailQ.data?.logs && !detailQ.data?.errorMessage && (_jsx("p", { className: "muted", style: { margin: 0 }, children: "No logs for this attempt." })), detailQ.data?.errorMessage && (_jsx("div", { className: "logError", children: detailQ.data.errorMessage })), detailQ.data?.logs && (_jsx("pre", { className: "logPre", children: detailQ.data.logs }))] }))] }));
}
export default function ProblemDetail() {
    const { id } = useParams();
    const api = useApi();
    const { token } = useAuth();
    const qc = useQueryClient();
    const [tab, setTab] = useState("desc");
    const didCompleteRef = useRef(false);
    const didExpireRef = useRef(false);
    const { data: problem, isLoading, error } = useQuery({
        queryKey: ["problem", id],
        queryFn: () => api(`/problems/${id}`),
        enabled: !!id,
    });
    const attemptsQ = useQuery({
        queryKey: ["attempts", id],
        queryFn: () => api(`/attempts?problemId=${id}`),
        enabled: !!token && !!id,
        refetchInterval: (q) => {
            const latest = q.state.data?.[0];
            const s = latest?.status;
            return s === "SUBMITTED" || s === "RUNNING" ? 1000 : false;
        },
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
    const attempts = attemptsQ.data;
    const loadingAttempts = attemptsQ.isLoading;
    const latest = useMemo(() => attempts?.[0] ?? null, [attempts]);
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState(() => langStub("javascript"));
    const [note, setNote] = useState(null);
    const [ask, setAsk] = useState("");
    const [aiMessage, setAiMessage] = useState("");
    const [lastLogs, setLastLogs] = useState(null);
    const [lastError, setLastError] = useState(null);
    function onChangeLanguage(next) {
        setLanguage(next);
        setCode((prev) => (prev.trim() ? prev : langStub(next)));
    }
    // ===== Personas (gate) =====
    const personasQ = useQuery({
        queryKey: ["personas", id],
        queryFn: () => api(`/problems/${id}/personas`),
        enabled: !!id,
    });
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);
    useEffect(() => {
        if (personasQ.data && !selectedPersonaId) {
            setSelectedPersonaId(personasQ.data.defaultPersonaId || personasQ.data.personas[0]?.id || null);
        }
    }, [personasQ.data, selectedPersonaId]);
    const [session, setSession] = useState(null);
    const showGate = !session;
    useEffect(() => {
        // new problem → clear session & chat & persona
        setSession(null);
        setSelectedPersonaId(null);
        setChat([]);
        setNote(null);
    }, [id]);
    async function startWithPersona(pid) {
        if (!id)
            return;
        const r = await api("/sessions", {
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
        if (!session?.sessionId)
            return;
        // only expire if not solved
        if (remainingSeconds === 0 && latest?.status !== "PASSED" && !didExpireRef.current) {
            didExpireRef.current = true;
            api(`/sessions/${session.sessionId}/expire`, { method: "POST" }).catch(() => { });
            setChat([]);
            setNote(" time’s up better luck next time!");
        }
    }, [remainingSeconds, latest?.status, session?.sessionId, api]);
    useEffect(() => {
        if (!session?.sessionId)
            return;
        if (latest?.status === "PASSED" && !didCompleteRef.current) {
            didCompleteRef.current = true;
            // stop the expire path
            didExpireRef.current = true;
            // (optional) tell server to end session (idempotent)
            api(`/sessions/${session.sessionId}/complete`, { method: "POST" }).catch(() => { });
            // show success banner
            setNote("gg, you passed! timer stopped; you can head back whenever.");
        }
    }, [latest?.status, session?.sessionId, api]);
    // ===== Attempts (submit) =====
    const submit = useMutation({
        mutationFn: async () => {
            const body = { problemId: Number(id), language, code, sessionId: session?.sessionId };
            return api("/attempts", {
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
            setNote(`Submitted: ${summary.status} (${summary.passedCount}/${summary.totalCount}) in ${summary.runtimeMs ?? 0} ms`);
            qc.invalidateQueries({ queryKey: ["attempts", id] });
            try {
                const detail = await api(`/attempts/${summary.id}`);
                if (detail?.logs) {
                    setLastLogs(detail.logs);
                    setNote((prev) => (prev ? prev + " — see logs below" : "See logs below"));
                }
                if (detail?.errorMessage)
                    setLastError(detail.errorMessage);
            }
            catch {
                setLastError("Failed to load attempt details");
            }
        },
        onError: (err) => setNote(err?.message || "Submission failed"),
    });
    const [chat, setChat] = useState([]);
    const endRef = useRef(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [chat.length]);
    const currentPersona = useMemo(() => (personasQ.data?.personas ?? []).find(p => p.id === selectedPersonaId) ?? null, [personasQ.data, selectedPersonaId]);
    const personaDisplay = currentPersona
        ? `${currentPersona.avatarEmoji ? currentPersona.avatarEmoji + " " : ""}${currentPersona.name}`
        : "Assistant";
    const askAi = useMutation({
        mutationFn: async (vars) => {
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
            return api("/ai/solve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        },
        onMutate: (vars) => {
            const my = (vars.prompt || "").trim();
            if (my) {
                setChat((c) => [...c, { id: `tmp-${Date.now()}`, role: "USER", text: my }]);
            }
            setAsk("");
        },
        onSuccess: (res) => {
            if (res?.code)
                setCode(normalizeAiCode(language, res.code));
            if (res?.assistantMessage)
                setChat((c) => [...c, res.assistantMessage]);
        },
        onError: () => {
            setChat((c) => [...c, { id: `err-${Date.now()}`, role: "SYSTEM", text: "AI request failed." }]);
        },
    });
    // Gate persona card
    function PersonaCard({ p, onPick }) {
        return (_jsxs("button", { onClick: () => onPick(p.id), className: "personaCard personaCard--big", title: p.tagline ?? "", children: [_jsx("div", { className: "personaAvatar personaAvatar--big", children: p.avatarEmoji ?? "🤖" }), _jsxs("div", { className: "personaMeta personaMeta--center", children: [_jsxs("div", { className: "personaName personaName--big", children: [p.name, p.isDefault ? " • default" : ""] }), p.tagline && _jsx("div", { className: "personaTagline personaTagline--big", children: p.tagline })] })] }));
    }
    return (_jsxs("main", { className: "page", children: [_jsx("style", { children: `
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
` }), note && (_jsx("div", { role: "alert", style: {
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontWeight: 600,
                    background: note.toLowerCase().includes("gg")
                        ? "#dcfce7" // green
                        : "#fee2e2", // red
                    color: note.toLowerCase().includes("gg") ? "#065f46" : "#7f1d1d",
                    border: "1px solid rgba(0,0,0,0.06)",
                }, children: note })), _jsxs("div", { className: "container", children: [isLoading && _jsx("p", { children: "Loading\u2026" }), error && _jsx("p", { style: { color: "#b91c1c" }, children: "Failed to load problem." }), problem && (_jsxs("div", { className: "grid", children: [_jsx("aside", { className: "sticky", children: _jsxs(Card, { className: "card-col", children: [_jsxs("div", { role: "tablist", className: "tablist", children: [_jsx(TabButton, { active: tab === "desc", onClick: () => setTab("desc"), children: "Description" }), _jsx(TabButton, { active: tab === "subs", onClick: () => setTab("subs"), children: "Submissions" })] }), _jsxs("div", { className: "leftContent", children: [tab === "desc" && (_jsxs("div", { children: [_jsx("div", { className: "row", style: { alignItems: "flex-start", justifyContent: "space-between" }, children: _jsxs("div", { children: [_jsx("h1", { style: { margin: 0, fontSize: 22 }, children: problem.title }), _jsx("div", { style: { marginTop: 4 }, children: _jsx(Difficulty, { value: problem.difficulty }) })] }) }), problem.description && (_jsxs("section", { style: { marginTop: 12 }, children: [_jsx("h3", { style: { margin: "8px 0", fontSize: 14 }, children: "Problem" }), _jsx("div", { className: "prose max-w-none", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: problem.description }) })] })), problem.examples && (_jsxs("section", { style: { marginTop: 12 }, children: [_jsx("h3", { style: { margin: "8px 0", fontSize: 14 }, children: "Examples" }), _jsx("pre", { children: JSON.stringify(problem.examples, null, 2) })] }))] })), tab === "subs" && (_jsxs("div", { children: [!token && _jsx("p", { className: "muted", children: "Log in to see your submissions." }), token && loadingAttempts && _jsx("p", { children: "Loading attempts\u2026" }), token && attempts && attempts.length === 0 && _jsx("p", { className: "muted", children: "No attempts yet." }), token && attempts && attempts.length > 0 && (_jsx("ul", { className: "list", children: _jsx("ul", { className: "list", children: attempts.map((a, idx) => (_jsx(AttemptRow, { attempt: a, defaultOpen: idx === 0 }, a.id))) }) })), (lastError || lastLogs) && (_jsxs("details", { style: { marginTop: 12 }, children: [_jsx("summary", { className: "muted", style: { cursor: "pointer" }, children: "View runner logs" }), lastError && _jsx("div", { style: { color: "#b91c1c", fontSize: 12, margin: "8px 0" }, children: lastError }), lastLogs && _jsx("pre", { style: { whiteSpace: "pre-wrap" }, children: lastLogs })] }))] }))] })] }) }), showGate ? (
                            // GATE spans middle + right
                            _jsx("section", { className: "sticky", style: { gridColumn: "span 2" }, children: _jsxs("div", { className: "card gateWrap", children: [_jsxs("div", { className: "gateHero", children: [_jsxs("div", { className: "gateHeroRow", children: [_jsx("div", { className: "modeTitle", children: problem.editorMode === "VIBECODE" ? "VIBE-CODE ONLY" : "FREE EDIT MODE" }), _jsx("div", { className: "timeTitle", children: problem.timeLimitSeconds ? `TIME LIMIT — ${formatMMSS(problem.timeLimitSeconds)}` : "NO TIME LIMIT" })] }), _jsx("div", { className: "gateSub", children: gateSubtitle(problem) })] }), _jsxs("div", { className: "gateBody gateBody--big", children: [_jsx("h2", { className: "gateHeading", children: "Choose your pair programming partner" }), personasQ.isLoading && _jsx("p", { className: "muted", children: "Loading personas\u2026" }), _jsx("div", { className: "personaGrid personaGrid--big", children: (personasQ.data?.personas ?? []).map((p) => (_jsx(PersonaCard, { p: p, onPick: startWithPersona }, p.id))) })] })] }) })) : (_jsxs(_Fragment, { children: [_jsx("section", { className: "sticky", children: _jsxs("div", { className: "card card-col", children: [_jsx("div", { className: "cardHeader", children: _jsxs("div", { className: "row", children: [_jsx("label", { style: { fontSize: 14 }, children: "Language" }), _jsxs("select", { value: language, onChange: (e) => onChangeLanguage(e.target.value), style: { width: 160 }, children: [_jsx("option", { value: "javascript", children: "JavaScript" }), _jsx("option", { value: "python", children: "Python" }), _jsx("option", { value: "cpp", children: "C++" })] }), _jsx("div", { className: "spacer" }), remainingSeconds != null && (_jsxs("span", { className: "timer", children: ["\u23F3 ", Math.floor(remainingSeconds / 60), ":", String(remainingSeconds % 60).padStart(2, "0")] })), _jsx("button", { onClick: () => submit.mutate(), disabled: submit.isPending || remainingSeconds === 0, className: "btn btnPrimary", children: submit.isPending ? "Running…" : "Run tests" })] }) }), _jsx("div", { className: "section section-grow", style: { paddingTop: 0 }, children: _jsx(CodeMirror, { value: code, onChange: setCode, height: "100%", style: { width: "100%" }, extensions: [langExtension(language), transparentBg], basicSetup: {
                                                            lineNumbers: true,
                                                            highlightActiveLine: true,
                                                            autocompletion: true,
                                                            foldGutter: true,
                                                            bracketMatching: true,
                                                            closeBrackets: true,
                                                        }, placeholder: "Write your solution here\u2026", editable: !readOnly }) })] }) }), _jsx("aside", { className: "sticky", children: _jsxs("div", { className: "card card-col", children: [_jsx("div", { className: "cardHeader", children: _jsxs("div", { className: "row", style: { alignItems: "center" }, children: [_jsxs("h4", { style: { margin: 0, fontSize: 14 }, children: [(currentPersona?.avatarEmoji ?? "🤖") + " ", currentPersona?.name ?? "Assistant"] }), _jsx("div", { className: "spacer" })] }) }), _jsx("div", { className: "section section-grow", style: { paddingTop: 0 }, children: _jsxs("div", { className: "chatList", children: [chat.length === 0 && (_jsx("p", { className: "muted", children: "Ask for a hint, complexity target, or a full draft solution. Returned code goes to the editor above." })), chat.map((m) => {
                                                                const rawText = m.text || "";
                                                                const tagMatch = rawText.match(/^\s*\[(.*?)\]\s*/);
                                                                const cleanText = tagMatch ? rawText.slice(tagMatch[0].length) : rawText;
                                                                return (_jsxs("div", { className: `chatMsg ${m.role.toLowerCase()}`, children: [_jsxs("div", { className: "muted", style: { fontSize: 12, marginBottom: 4, display: "flex", gap: 8, alignItems: "center" }, children: [_jsx("span", { style: { fontWeight: 600 }, children: m.role === "USER"
                                                                                        ? "You"
                                                                                        : m.role === "ASSISTANT"
                                                                                            ? ((currentPersona?.avatarEmoji ? `${currentPersona.avatarEmoji} ` : "") + (currentPersona?.name ?? "Assistant"))
                                                                                            : "System" }), m.sentAt ? _jsxs("span", { children: ["\u2022 ", new Date(m.sentAt).toLocaleString()] }) : null] }), m.text && _jsx("div", { style: { whiteSpace: "pre-wrap" }, children: cleanText }), m.role === "ASSISTANT" && m.code && (_jsx("div", { className: "muted", style: { fontSize: 12, marginTop: 6 }, children: "(Code inserted into editor)" }))] }, m.id));
                                                            }), _jsx("div", { ref: endRef })] }) }), _jsxs("div", { className: "section", style: { borderTop: `1px solid var(--border)` }, children: [_jsxs("div", { className: "row", style: { alignItems: "flex-start" }, children: [_jsx("textarea", { value: ask, onChange: (e) => setAsk(e.target.value), rows: 2, className: "input", placeholder: 'e.g. "O(n) two-pointer version + explanation"' }), _jsx("button", { onClick: () => askAi.mutate({ prompt: ask }), disabled: askAi.isPending || !ask.trim() || remainingSeconds === 0, className: "btn btnPrimary", children: askAi.isPending ? "Sending…" : "Ask AI" })] }), askAi.error && (_jsx("p", { style: { color: "#b91c1c", fontSize: 12, marginTop: 8 }, children: "AI request failed." }))] })] }) })] }))] }))] })] }));
}
