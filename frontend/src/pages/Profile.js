import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/Profile.tsx
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import { Link } from "react-router-dom";
import DeleteAccountPanel from "../components/DeleteAccountPanel";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
function fmtDate(d) {
    if (!d)
        return "—";
    const dt = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
    return dt.toLocaleString();
}
function pct(n, d) {
    if (!d || d <= 0)
        return 0;
    return Math.round((n / d) * 100);
}
function DifficultyBadge({ value }) {
    const v = (value || "").toLowerCase();
    const tone = v === "easy" ? "easy" : v === "medium" ? "medium" : v === "hard" ? "hard" : "neutral";
    return _jsx("span", { className: `badge ${tone}`, children: value ?? "-" });
}
function RoleBadge({ role }) {
    const admin = (role || "").toUpperCase() === "ADMIN";
    return _jsx("span", { className: `roleBadge ${admin ? "admin" : "user"}`, children: role ?? "USER" });
}
function Avatar({ email }) {
    const letter = (email || "?").trim().charAt(0).toUpperCase();
    return _jsx("div", { className: "avatar", children: letter });
}
export default function Profile() {
    const { token } = useAuth();
    const api = useApi();
    const meQ = useQuery({
        queryKey: ["me"],
        queryFn: () => api("/me"),
        enabled: !!token,
    });
    const sumQ = useQuery({
        queryKey: ["attempts-summary"],
        queryFn: () => api("/attempts/summary"),
        enabled: !!token,
    });
    if (!token) {
        return (_jsxs("main", { className: "profilePage", children: [_jsx("style", { children: baseStyles }), _jsxs("div", { className: "hero", style: { background: "linear-gradient(90deg, #6366f1, #22d3ee)" }, children: [_jsx("div", { className: "heroGlow" }), _jsx("div", { className: "heroRow", children: _jsxs("div", { children: [_jsx("div", { className: "heroKicker", children: "Profile" }), _jsx("div", { className: "heroTitle", children: "You\u2019re not logged in" }), _jsx("div", { className: "heroSub", children: "Log in to view your stats, clears, and ongoing tickets." })] }) })] }), _jsx("div", { className: "sectionStack", children: _jsxs("div", { className: "notice", children: ["You\u2019re not logged in. ", _jsx(Link, { className: "link", to: "/login", children: "Log in" }), " to view your profile."] }) })] }));
    }
    const me = meQ.data ?? null;
    const rows = sumQ.data ?? [];
    const succeeded = rows.filter((r) => r.status === "PASSED");
    const attemptedNotSucceeded = rows.filter((r) => r.status !== "PASSED");
    const total = rows.length;
    const passed = succeeded.length;
    const active = attemptedNotSucceeded.length;
    const passRate = pct(passed, total);
    const lastActivity = rows
        .map((r) => +new Date(r.submittedAt))
        .sort((a, b) => b - a)[0];
    const adminEmail = (ADMIN_EMAIL ?? "").trim().toLowerCase();
    const myEmail = (me?.email ?? "").trim().toLowerCase();
    const isAdmin = (!!myEmail && !!adminEmail && myEmail === adminEmail) ||
        String(me?.role).toUpperCase() === "ADMIN";
    return (_jsxs("main", { className: "profilePage", children: [_jsx("style", { children: baseStyles }), _jsxs("div", { className: "hero", style: { background: "linear-gradient(90deg, #8b5cf6, #ef4444)" }, children: [_jsx("div", { className: "heroGlow" }), _jsxs("div", { className: "heroRow", children: [_jsxs("div", { className: "heroL", children: [_jsx(Avatar, { email: me?.email }), _jsxs("div", { children: [_jsx("div", { className: "heroKicker", children: "Player Card" }), _jsx("div", { className: "heroTitle", children: me?.email ?? "Loading…" }), _jsxs("div", { className: "heroSub", children: ["Member since ", _jsx("strong", { children: me ? fmtDate(me.createdAt) : "—" }), " \u2022 ", _jsx(RoleBadge, { role: me?.role })] })] })] }), _jsxs("div", { className: "statsRow", children: [_jsx(StatCard, { label: "Clears", value: passed, hint: "Problems passed" }), _jsx(StatCard, { label: "Active Tickets", value: active, hint: "Not yet passed" }), _jsx(StatCard, { label: "Pass Rate", value: `${passRate}%`, hint: `${passed}/${total || 0}` }), _jsx(StatCard, { label: "Last Activity", value: lastActivity ? fmtDate(lastActivity) : "—" })] })] })] }), _jsxs("div", { className: "sectionStack", children: [_jsxs("section", { className: "panel", children: [_jsxs("div", { className: "panelHead", children: [_jsx("h3", { className: "panelTitle", children: "Cleared Tickets" }), _jsx("div", { className: "panelSub", children: sumQ.isLoading ? "Loading…" : passed ? `You’ve cleared ${passed} unique problems.` : "No clears yet — pick a ticket and go!" })] }), _jsxs("div", { className: "cardGrid", children: [succeeded.map((r) => (_jsxs("div", { className: "probCard", children: [_jsxs("div", { className: "probTop", children: [_jsx(Link, { to: `/problems/${r.problemId}`, className: "probLink", children: r.problem.title }), _jsx("span", { className: "statusPill passed", children: "PASSED" })] }), _jsx("div", { className: "probBadges", children: _jsx(DifficultyBadge, { value: r.problem.difficulty }) }), _jsxs("div", { className: "probMeta", children: ["Last attempt: ", fmtDate(r.submittedAt)] })] }, r.problemId))), !sumQ.isLoading && succeeded.length === 0 && (_jsx("div", { className: "emptyCard", children: "No clears yet." }))] })] }), _jsxs("section", { className: "panel", children: [_jsxs("div", { className: "panelHead", children: [_jsx("h3", { className: "panelTitle", children: "Work in Progress" }), _jsx("div", { className: "panelSub", children: sumQ.isLoading ? "Loading…" : active ? `You have ${active} active tickets.` : "All clear! Nothing pending." })] }), _jsxs("ul", { className: "list", children: [attemptedNotSucceeded.map((r) => (_jsxs("li", { className: "listItem", children: [_jsxs("div", { className: "listL", children: [_jsx(Link, { to: `/problems/${r.problemId}`, className: "listTitle", children: r.problem.title }), _jsxs("div", { className: "listSub", children: [_jsx(DifficultyBadge, { value: r.problem.difficulty }), " \u2022 Last attempt ", fmtDate(r.submittedAt)] })] }), _jsxs("div", { className: "listR", children: [_jsx("span", { className: "statusPill neutral", children: r.status }), _jsx(Link, { to: `/problems/${r.problemId}`, className: "actionBtn", children: "Resume" })] })] }, r.problemId))), !sumQ.isLoading && attemptedNotSucceeded.length === 0 && (_jsx("li", { className: "listEmpty", children: "No active tickets." }))] })] }), _jsx(DeleteAccountPanel, {}), isAdmin && (_jsxs("section", { className: "panel", children: [_jsxs("div", { className: "panelHead", children: [_jsx("h3", { className: "panelTitle", children: "Admin" }), _jsx("div", { className: "panelSub", children: "Private tools" })] }), _jsx("div", { style: { padding: 14 }, children: _jsx(Link, { to: "/admin", className: "actionBtn", children: "Open Admin KPIs \u2192" }) })] }))] })] }));
}
/* --- tiny presentational helpers --- */
function StatCard({ label, value, hint }) {
    return (_jsxs("div", { className: "statCard", children: [_jsx("div", { className: "statValue", children: value }), _jsx("div", { className: "statLabel", children: label }), hint ? _jsx("div", { className: "statHint", children: hint }) : null] }));
}
/* --- styles (no Tailwind) --- */
const baseStyles = `
.profilePage { max-width: 1120px; margin: 0 auto; padding: 24px 16px; color: #111827; }

/* Hero */
.hero { position: relative; overflow: hidden; border-radius: 20px; padding: 24px; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.heroGlow { position: absolute; inset: 0; background: radial-gradient(1200px 400px at 80% -10%, rgba(255,255,255,.6), transparent 50%); opacity: .2; pointer-events: none; }
.heroRow { position: relative; display: flex; gap: 16px; align-items: center; justify-content: space-between; }
.heroL { display: flex; align-items: center; gap: 14px; }
.heroKicker { font-size: 12px; opacity: .9; }
.heroTitle { font-size: 28px; font-weight: 800; letter-spacing: .2px; }
.heroSub { margin-top: 6px; font-size: 14px; opacity: .95; display: flex; align-items: center; gap: 8px; }

/* Avatar */
.avatar { width: 52px; height: 52px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-weight: 800; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); }

/* Role badge */
.roleBadge { display:inline-block; font-size:11px; font-weight:700; padding:3px 8px; border-radius:999px; border:1px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.15); color:#fff; }
.roleBadge.admin { background: rgba(168,85,247,0.2); }
.roleBadge.user {}

/* Stat cards */
.statsRow { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 10px; min-width: 420px; }
.statCard { border-radius: 16px; background: rgba(255,255,255,0.85); color: #111827; border: 1px solid rgba(0,0,0,0.06); padding: 12px 14px; text-align: right; box-shadow: 0 1px 5px rgba(0,0,0,0.06); }
.statValue { font-size: 20px; font-weight: 800; }
.statLabel { font-size: 12px; color: #475569; }
.statHint { margin-top: 2px; font-size: 11px; color: #64748b; }

/* Sections */
.sectionStack { display: flex; flex-direction: column; gap: 24px; margin-top: 24px; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow: hidden; }
.panelHead { padding: 14px 16px; border-bottom: 1px solid #eef0f3; background: #f8fafc; }
.panelTitle { margin: 0; font-size: 16px; font-weight: 800; }
.panelSub { margin-top: 4px; font-size: 13px; color: #475569; }

/* Grid of passed tickets */
.cardGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; padding: 14px; }
.probCard { border-radius: 16px; border: 1px solid #e5e7eb; background: #fff; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:8px; min-height: 110px; }
.probTop { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.probLink { font-weight: 800; color: #111827; text-decoration: none; }
.probLink:hover { text-decoration: underline; }
.probBadges { display: flex; gap: 6px; align-items: center; }
.probMeta { font-size: 12px; color: #64748b; }
.emptyCard { border-radius: 16px; border: 1px dashed #e5e7eb; background: #fafafa; padding: 18px; color: #6b7280; font-size: 14px; text-align: center; }

/* WIP list */
.list { list-style: none; margin: 0; padding: 0; }
.listItem { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; border-top: 1px solid #eef0f3; }
.listItem:first-child { border-top: 0; }
.listL { min-width: 0; }
.listTitle { font-weight: 700; color:#111827; text-decoration:none; }
.listTitle:hover { text-decoration: underline; }
.listSub { margin-top: 4px; font-size: 12px; color: #64748b; display: flex; align-items:center; gap: 6px; }
.listR { display: flex; align-items: center; gap: 8px; }
.listEmpty { padding: 16px; font-size: 14px; color: #64748b; }

/* Badges */
.badge { display:inline-block; font-size:11px; font-weight:700; padding:3px 8px; border-radius:999px; border:1px solid; }
.badge.easy { background: #ecfdf5; color:#065f46; border-color:#a7f3d0; }
.badge.medium { background: #fffbeb; color:#92400e; border-color:#fde68a; }
.badge.hard { background: #fef2f2; color:#b91c1c; border-color:#fecaca; }
.badge.neutral { background: #f3f4f6; color:#374151; border-color:#e5e7eb; }

/* Status pills */
.statusPill { font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 999px; border: 1px solid; }
.statusPill.passed { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
.statusPill.neutral { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }

/* Buttons & links */
.actionBtn { display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:12px; padding:6px 10px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#111827; text-decoration:none; }
.actionBtn:hover { background:#f8fafc; }
.link { color:#0ea5e9; text-decoration: underline; }

.panel.danger { border-color:#fecaca; }
.dangerBody { padding: 14px; display:flex; flex-direction:column; gap:10px; }
.modeRow { display:flex; gap:16px; font-size:13px; color:#374151; }
.input { border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; }
.btn.danger { background:#b91c1c; color:#fff; border:1px solid #991b1b; border-radius:10px; padding:8px 12px; font-weight:800; }
.btn.danger:hover { background:#dc2626; text-decoration:none; }
.err { color:#b91c1c; font-size:12px; }

/* Notices */
.notice { border-radius: 14px; border: 1px solid #e5e7eb; background: #fff; padding: 14px; font-size: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
`;
