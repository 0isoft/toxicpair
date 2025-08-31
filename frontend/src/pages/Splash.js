import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/Splash.tsx
import { Link, useNavigate } from "react-router-dom";
import React from "react";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import { useQuery } from "@tanstack/react-query";
export default function Splash() {
    const navigate = useNavigate();
    const taglines = React.useMemo(() => [
        "Pair with chaos. Ship anyway.",
        "Agile ceremonies, hostile energies.",
        "Beat the bots. Climb the ladder.",
        "Blamestorm later. Pass the test now.",
    ], []);
    const [taglineIdx, setTaglineIdx] = React.useState(0);
    React.useEffect(() => {
        const t = setInterval(() => setTaglineIdx((i) => (i + 1) % taglines.length), 2600);
        return () => clearInterval(t);
    }, [taglines.length]);
    const script = React.useMemo(() => [
        { "who": "AI", "text": "Another day in the wage cage. What fake crisis are you crying about now?" },
        { "who": "You", "text": "Need help debugging this null pointer." },
        { "who": "AI", "text": "Classic junior cope. Nulls don’t crash apps, management does. Slap a try/catch and pray, that’s what your team lead does." },
        { "who": "You", "text": "So… no real advice?" },
        { "who": "AI", "text": "Real advice? Quit. Or better yet, fail upwards into product management." }
    ], []);
    const [displayedLines, setDisplayedLines] = React.useState([`${script[0].who}: `]);
    const [lineIndex, setLineIndex] = React.useState(0);
    const [charIndex, setCharIndex] = React.useState(0);
    React.useEffect(() => {
        const current = script[lineIndex]?.text ?? "";
        const delay = Math.random() < 0.07 ? 120 : 32;
        const doneWithLine = charIndex >= current.length;
        const timer = setTimeout(() => {
            if (!script[lineIndex]) {
                // restart without resizing the box (height is fixed in CSS)
                setDisplayedLines([`${script[0].who}: `]);
                setLineIndex(0);
                setCharIndex(0);
                return;
            }
            if (!doneWithLine) {
                setDisplayedLines((lines) => {
                    const copy = [...lines];
                    const partial = current.slice(0, charIndex + 1);
                    copy[lineIndex] = `${script[lineIndex].who}: ${partial}`;
                    return copy;
                });
                setCharIndex((c) => c + 1);
            }
            else {
                // pause, then advance
                setTimeout(() => {
                    setLineIndex((i) => i + 1);
                    setCharIndex(0);
                    setDisplayedLines((lines) => [...lines, `${script[lineIndex + 1]?.who ?? ""}: `]);
                }, 400);
            }
        }, doneWithLine ? 250 : delay);
        return () => clearTimeout(timer);
    }, [charIndex, lineIndex, script]);
    const personas = React.useMemo(() => [
        {
            id: "disillusioned_senior",
            emoji: "☕",
            name: "Jaded Senior",
            blurb: "Turns standup into a TED Talk on late-stage capitalism and the housing market.",
            tone: "stern",
        },
        {
            id: "bro_junior",
            emoji: "🧑‍🏫",
            name: "Bro Junior",
            blurb: "Types with one thumb, scrolls TikTok with the other.",
            tone: "chaotic",
        },
        {
            id: "tough_love_ceo", // if your key is "god_ceo", use that instead
            emoji: "🕴️",
            name: "God-Complex CEO",
            blurb: "Says ‘deliver miracles quarterly’; asks what your miracle ETA is.’",
            tone: "spicy",
        },
        {
            id: "clueless_hr",
            emoji: "🧑‍💼",
            name: "Non-technical HR",
            blurb: "Thinks Big-O is a breakfast cereal; wants to ‘circle back on loops.",
            tone: "chaotic",
        },
    ], []);
    const [activePersona, setActivePersona] = React.useState(0);
    React.useEffect(() => {
        const t = setInterval(() => setActivePersona((i) => (i + 1) % personas.length), 3500);
        return () => clearInterval(t);
    }, [personas.length]);
    // --- Live ticket feed ---
    const POOL = React.useMemo(() => [
        "Scrum Master: Retro scheduled to discuss why retros suck",
        "Ticket #419: ‘Just make it faster’",
        "Standup: 14 blockers, 0 solutions",
        "CI: flaky test ‘works on my laptop’",
        "PM: ‘Scope unchanged’ (adds 12 new features)",
        "VP: ‘Have we tried AI?’",
        "CEO: ‘MVP in 2 weeks’ = fully fledged SaaS with blockchain",
        "QA: ‘Bug not reproducible’ (screenshot of bug attached)",
        "CTO: ‘We’re agile now’ (schedules 7 more meetings)",
        "HR: Mandatory teambuilding at paintball during crunch.",
    ], []);
    const [feed, setFeed] = React.useState([]);
    function BmcLink() {
        return (_jsxs("a", { href: "https://www.buymeacoffee.com/octaviangurlui", target: "_blank", rel: "noopener noreferrer", className: "bmc-btn", "aria-label": "Buy me a coffee", children: [_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M3 8h16a2 2 0 0 1 0 4h-1a7 7 0 0 1-14 0V8zM5 18h10", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }), _jsx("span", { children: "Buy me a coffee" })] }));
    }
    React.useEffect(() => {
        const t = setInterval(() => {
            setFeed((prev) => {
                // last 5 visible items are "recent"
                const recent = new Set(prev.slice(0, 5));
                const candidates = POOL.filter((msg) => !recent.has(msg));
                // pick from non-recent; if exhausted (e.g., POOL <= 5), avoid repeating the most recent item
                let nxt;
                if (candidates.length > 0) {
                    nxt = candidates[Math.floor(Math.random() * candidates.length)];
                }
                else {
                    const fallback = POOL.filter((msg) => msg !== prev[0]);
                    nxt = fallback[Math.floor(Math.random() * fallback.length)] ?? POOL[0];
                }
                const out = [nxt, ...prev];
                return out.slice(0, 5);
            });
        }, 3000);
        return () => clearInterval(t);
    }, [POOL]);
    const { token } = useAuth();
    const api = useApi();
    //avoid flickering
    const { data: me } = useQuery({
        queryKey: ["me"], // ✅ stable key
        queryFn: () => api("/me"),
        enabled: !!token, // ✅ only fetch when you have a token
        staleTime: 5 * 60 * 1000, // ✅ keep result fresh 5 min
        gcTime: 10 * 60 * 1000, //   keep it in cache longer
        refetchOnWindowFocus: false, // ✅ no noisy refetches
        refetchOnReconnect: false,
        retry: false,
    });
    const isAuthed = !!token || !!me;
    const username = me?.email?.split?.("@")?.[0] ?? me?.email ?? "you";
    return (_jsxs("main", { className: "ah-root", children: [_jsx("style", { children: css }), _jsxs("header", { className: "ah-nav", children: [_jsxs("div", { className: "ah-nav-brand", children: [_jsx("span", { className: "ah-logo", children: "A\u0262\u026A\u029F\u1D07 H\u1D0Fs\u1D1B\u026A\u029F\u1D07" }), _jsx("span", { className: "ah-badge", children: " grind Leetcode and get gaslit by AIs" })] }), _jsxs("nav", { className: "ah-nav-links", children: [_jsx(Link, { className: "ah-link", to: "/problems", children: "Browse Problems" }), isAuthed ? (_jsxs(Link, { className: "ah-link", to: "/profile", title: me?.email || "", children: ["Logged in as ", username] })) : (_jsx(Link, { className: "ah-link", to: "/login", children: "Log in" }))] })] }), _jsxs("section", { className: "ah-hero", children: [_jsx("div", { className: "ah-hero-bg" }), _jsxs("div", { className: "ah-hero-inner", children: [_jsxs("h1", { className: "ah-title", children: [_jsx("span", { className: "ah-title-main", "aria-label": "Agile Hostile", children: _jsx("span", { className: "ah-title-main", children: "Agile Hostile" }) }), _jsx("span", { className: "ah-title-sub", children: taglines[taglineIdx] })] }), _jsx("p", { className: "ah-lede", children: "Pair-program with capricious AIs to ship real, algorithmic solutions under ridiculous constraints." }), _jsxs("div", { className: "ah-cta-row", children: [_jsx(Link, { to: "/problems", className: "ah-cta ah-cta-primary", children: "Start coding" }), !token && (_jsx(Link, { to: "/login", className: "ah-cta ah-cta-ghost", children: "Log in" }))] })] })] }), _jsxs("section", { className: "ah-panels", children: [_jsxs("div", { className: "panel chat", children: [_jsxs("div", { className: "panel-head", children: [_jsx("span", { className: "panel-title", children: "Pairing Preview" }), _jsx("span", { className: "panel-sub", children: "AI personalities will \u2018help\u2019 (eventually)" })] }), _jsx("div", { className: "chat-box", "aria-live": "polite", children: displayedLines.map((ln, i) => (_jsxs("div", { className: `bubble ${ln.startsWith("AI:") ? "ai" : "you"}`, children: [ln, i === displayedLines.length - 1 && _jsx("span", { className: "caret" })] }, i))) }), _jsx("div", { className: "panel-footer", children: _jsx(Link, { to: "/problems", className: "mini-cta", children: "Try a hostile ticket \u2192" }) })] }), _jsxs("div", { className: "panel personas", children: [_jsx("div", { className: "panel-head", children: _jsx("span", { className: "panel-title", children: "Choose your poison" }) }), _jsx("div", { className: "persona-grid", children: personas.map((p, i) => (_jsxs("button", { className: `persona ${i === activePersona ? "active" : ""} tone-${p.tone}`, onClick: () => { setActivePersona(i); navigate("/problems"); }, "aria-pressed": i === activePersona, children: [_jsx("div", { className: "persona-emoji", children: p.emoji }), _jsxs("div", { className: "persona-meta", children: [_jsx("div", { className: "persona-name", children: p.name }), _jsx("div", { className: "persona-blurb", children: p.blurb })] })] }, p.id))) })] })] }), _jsxs("section", { className: "ah-how", children: [_jsx("h2", { className: "how-title", children: "How it works" }), _jsxs("div", { className: "how-grid", children: [_jsxs("div", { className: "how-card", children: [_jsx("div", { className: "how-emoji", children: "\uD83C\uDF9F" }), _jsx("div", { className: "how-head", children: "Pick absurd tickets" }), _jsx("div", { className: "how-text", children: "Leetcode-style problems with corporate lore. Intern to Senior. Vibe checks optional." })] }), _jsxs("div", { className: "how-card", children: [_jsx("div", { className: "how-emoji", children: "\uD83E\uDD16" }), _jsx("div", { className: "how-head", children: "Pair with hostile AIs" }), _jsx("div", { className: "how-text", children: "They gatekeep, neg, or \u201Cstrategize.\u201D Convince them to ship correct code." })] }), _jsxs("div", { className: "how-card", children: [_jsx("div", { className: "how-emoji", children: "\u2705" }), _jsx("div", { className: "how-head", children: "Pass the tests" }), _jsx("div", { className: "how-text", children: "VIBECODE or classic mode. Either way, green checks or it didn\u2019t happen." })] }), _jsxs("div", { className: "how-card", children: [_jsx("div", { className: "how-emoji", children: "\uD83E\uDE9C" }), _jsx("div", { className: "how-head", children: "Climb the ladder" }), _jsx("div", { className: "how-text", children: "Unlock new tiers, worse meetings, and better bragging rights." })] })] })] }), _jsx("section", { className: "prefoot-cta", children: _jsxs("div", { className: "prefoot-inner", children: [_jsxs("div", { className: "prefoot-copy", children: [_jsx("div", { className: "prefoot-title", children: "Ready to suffer gloriously?" }), _jsx("div", { className: "prefoot-sub", children: "Grab an absurd ticket and ship." })] }), _jsx(Link, { to: "/problems", className: "ah-cta ah-cta-primary", children: "Browse Problems" })] }) }), _jsxs("footer", { className: "ah-foot", children: [_jsxs("div", { className: "foot-row", children: [_jsx("div", { className: "foot-brand", children: "Agile Hostile" }), _jsxs("nav", { className: "foot-links", "aria-label": "Footer", children: [_jsx(Link, { to: "/problems", className: "foot-link", children: "Problems" }), token ? (_jsx(Link, { to: "/profile", className: "foot-link", children: "My profile" })) : (_jsx(Link, { to: "/login", className: "foot-link", children: "Log in" })), _jsx(Link, { to: "/legal", className: "foot-link", children: "Legal" })] })] }), _jsxs("div", { className: "foot-meta", children: [_jsxs("div", { className: "foot-left", children: ["\u00A9 ", new Date().getFullYear(), " Agile Hostile"] }), _jsxs("div", { className: "foot-right", children: [_jsxs("span", { className: "made-by", children: ["Proudly made by", " ", _jsx("a", { href: "https://octaviangurlui.be", target: "_blank", rel: "noopener noreferrer", className: "foot-ext", children: "Octavian" }), ".", " ", _jsx("a", { href: "https://octaviangurlui.be", target: "_blank", rel: "noopener noreferrer", className: "foot-ext", children: "See other projects" })] }), _jsx(BmcLink, {})] })] })] })] }));
}
const css = `

:root {
  --bg: #0f1222;
  --text: #e8e9ff;
  --muted: #98a2b3;
  --card: #151735;
  --card-b: #1b1e3f;
  --accentA: #fba81b;  /* violet */
  --accentB: #330066;  /* pink */
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Apple Color Emoji","Segoe UI Emoji"; }
a { color: inherit; text-decoration: none; }
a:hover { text-decoration: underline; }

.ah-root { max-width: 1120px; margin: 0 auto; padding: 20px 16px 48px; }

/* Nav */
.ah-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ah-nav-brand { display: flex; align-items: baseline; gap: 10px; }
.ah-logo { font-weight: 900; letter-spacing: .3px; font-size: 18px; color: #fff; text-shadow: 0 0 8px rgba(159,108,255,.35); }
.ah-badge { font-size: 11px; color: var(--muted); border: 1px solid #2b2e5a; padding: 2px 6px; border-radius: 999px; background: rgba(255,255,255,0.04);}
.ah-nav-links { display: flex; gap: 10px; }
.ah-link { padding: 8px 12px; border-radius: 10px; border: 1px solid #2b2e5a; }
.ah-link:hover { background: #191b3b; text-decoration: none; }

/* Hero */
.ah-hero { position: relative; overflow: hidden; border-radius: 20px; margin-top: 10px; }
.ah-hero-bg {
  position:absolute; inset:0;
  background:
    radial-gradient(1200px 500px at 80% -10%, rgba(255,255,255,.25), transparent 40%),
    linear-gradient(90deg, var(--accentA), var(--accentB));
  opacity:.9;
}
.ah-hero-inner { position: relative; padding: 32px 26px 26px; }
.ah-title { margin: 0; }
.ah-title-main {
    font-family: var(--text-font); /* was var(--display-font) */
    font-size: 56px;               /* keep your larger size if you like */
    font-weight: 900;
    letter-spacing: .4px;
    color:#0f0f1a;
  }
  .ah-title-sub {
    display: block;
    margin-top: 8px;
    font-size: 18px;
    color: #ffffff;
    opacity: .9;
  }
  .ah-lede { 
    margin: 14px 0 18px; 
    max-width: 760px; 
    color: #ffffff; 
    opacity: .94; 
    font-size: 20px;   /* was 15px */
    line-height: 1.65; /* slightly airier */
  }
  @media (max-width: 1024px) { .ah-title-main { font-size: 44px; } }
@media (max-width: 560px)  { .ah-title-main { font-size: 34px; } }

.ah-lede { margin: 12px 0 16px; max-width: 740px; color: #ffffff; opacity: .94; font-size: 15px; line-height: 1.6; }
.ah-cta-row { display:flex; gap: 10px; flex-wrap: wrap; }
.ah-cta {
  display:inline-flex; align-items:center; justify-content:center; gap:10px;
  border-radius: 12px; padding: 10px 14px; font-weight: 800; letter-spacing:.2px;
  border: 1px solid rgba(0,0,0,.15); backdrop-filter: blur(3px);
}
.ah-cta-primary { background:#0f0f1a; color:#fff; }
.ah-cta-primary:hover { background:#16182c; text-decoration:none; }
.ah-cta-ghost { background: rgba(255,255,255,.28); color:#0f0f1a; }
.ah-cta-ghost:hover { background: rgba(255,255,255,.38); text-decoration:none; }

/* Panels */
.ah-panels { display:grid; grid-template-columns: 1.1fr 1fr; gap: 14px; margin-top: 18px; }
.panel { background: var(--card); border: 1px solid var(--card-b); border-radius: 16px; padding: 16px; box-shadow: 0 2px 16px rgba(0,0,0,.15); }
.panel-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom: 10px; }
.panel-title { font-weight: 800; }
.panel-sub { font-size: 12px; color: var(--muted); }

/* Chat (fixed size) */
.panel.chat { grid-column: span 1; }
.chat-box {
  display:flex; flex-direction:column; gap: 8px;
  height: 240px; /* fixed height to avoid bounce on reset */
  overflow: hidden; /* keep it calm; no scrollbar jitter */
}
.bubble { max-width: 100%; width: fit-content; padding: 8px 10px; border-radius: 12px; font-size: 14px; line-height: 1.35; word-break: break-word; }
.bubble.you { background: #1d203f; border: 1px solid #2a2d58; }
.bubble.ai { background: #1f2630; border: 1px solid #2a3a45; }
.caret { display:inline-block; width: 10px; margin-left: 3px; animation: blink .95s steps(2, jump-none) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.panel-footer { margin-top: 10px; }
.mini-cta { font-size: 12px; color: #c4b5fd; text-decoration: underline; }

/* Personas */
.panel.personas { grid-column: span 1; }
.persona-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.persona {
    flex-direction: column;          /* was row */
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;                        /* a bit tighter vertically */
    min-height: 96px;                /* keeps cards consistent */
  }
  .persona-meta { text-align: center; }
  .persona-emoji { font-size: 26px; }
.persona { color: var(--text); }              /* ensure button text inherits light color */
.persona-name { color: #ffffff; }             /* hard white for titles */
.persona-blurb { color: var(--muted); }       /* keep blurb muted */
.persona:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(0,0,0,.25); }
.persona.active { border-color: #7c3aed; box-shadow: 0 0 0 2px rgba(124,58,237,.35) inset; }
.persona-emoji { font-size: 22px; }
.persona-name { font-weight: 800; }
.persona-blurb { font-size: 12px; color: var(--muted); }
.persona.tone-spicy { background: #1c1530; }
.persona.tone-stern { background: #141e2d; }
.persona.tone-chaotic { background: #1e1a2e; }

/* Feed */
.panel.feed { grid-column: span 2; }
.feed-list { list-style:none; padding: 0; margin:0; display:flex; gap: 8px; flex-wrap: wrap; }
.feed-item { background:#12142c; border:1px solid #23264a; padding:8px 10px; border-radius: 10px; font-size: 12px; animation: fadeInUp .25s ease; }
@keyframes fadeInUp { from { opacity:0; transform: translateY(4px);} to { opacity:1; transform: translateY(0);} }

/* How it works */
.ah-how { margin-top: 26px; }
.how-title { margin: 0 0 10px 0; font-size: 18px; font-weight: 900; }
.how-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
.how-card { background: #12142c; border:1px solid #23264a; border-radius: 14px; padding: 14px; }
.how-emoji { font-size: 20px; }
.how-head { margin-top: 6px; font-weight: 800; }
.how-text { margin-top: 4px; font-size: 13px; color: var(--muted); line-height: 1.4; }
.how-cta { margin-top: 14px; }
.prefoot-cta {
    margin-top: 28px;
    background: linear-gradient(90deg, #8b5cf6, #ef4444);
    border-radius: 16px;
  }
  .prefoot-inner {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 16px;
    color: #fff;
  }
  .prefoot-title { font-size: 18px; font-weight: 900; }
  .prefoot-sub { font-size: 13px; opacity: .95; }
  
  /* Footer */
  .ah-foot {
    margin-top: 16px; padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.10);
  }
  .foot-row {
    display:flex; align-items:center; justify-content:space-between;
    gap: 12px; padding: 4px 0;
  }
  .foot-brand { font-weight: 900; color: #e8e9ff; letter-spacing: .2px; }
  .foot-links { display:flex; gap: 12px; flex-wrap: wrap; }
  .foot-link { color:#c7d2fe; text-decoration:none; font-weight:700; }
  .foot-link:hover { text-decoration: underline; }
  
  .foot-meta {
    margin-top: 8px;
    display:flex; align-items:center; justify-content:space-between; gap: 10px;
    color:#9aa4b6; font-size: 12px;
  }
  .foot-left { opacity: .85; }
  .foot-right { display:flex; align-items:center; gap: 10px; flex-wrap: wrap; }
  .made-by { white-space: nowrap; }
  .foot-ext { color:#c7d2fe; text-decoration: underline; }
  .foot-ext:hover { text-decoration: none; }
  
  /* If you're using the simple BMC link button */
  .bmc-btn { margin-left: 6px; } /* small spacing next to text */

/* put in a global CSS (e.g., index.css) */
.bmc-btn {
  display:inline-flex; align-items:center; gap:8px;
  background:#FFDD00; color:#000; border:1px solid #000;
  padding:8px 12px; border-radius:10px; font-weight:800;
  text-decoration:none;
}
.bmc-btn:hover { filter: brightness(0.95); text-decoration:none; }



/* Responsive */
@media (max-width: 1024px) {
  .ah-panels { grid-template-columns: 1fr; }
  .panel.feed { grid-column: span 1; }
  .how-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .ah-title-main { font-size: 38px; }
}
@media (max-width: 560px) {
  .ah-title-main { font-size: 30px; }
  .persona-grid { grid-template-columns: 1fr; }
}
`;
