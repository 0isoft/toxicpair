import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/ProblemsList.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useApi } from "../lib/api";
const TIER_LABEL = {
    INTERN: "Intern",
    JUNIOR: "Junior",
    SENIOR: "Senior",
};
// Theme colors (no Tailwind)
const TIER_THEME = {
    INTERN: { from: "#60a5fa", to: "#6366f1", bar: "#3b82f6", emoji: "🪜" },
    JUNIOR: { from: "#a78bfa", to: "#d946ef", bar: "#8b5cf6", emoji: "⚙️" },
    SENIOR: { from: "#f59e0b", to: "#f43f5e", bar: "#f59e0b", emoji: "🏆" },
};
const TIER_TICKETS = { INTERN: 3, JUNIOR: 5, SENIOR: 7 };
function pct(n, d) {
    if (!d || d <= 0)
        return 0;
    return Math.max(0, Math.min(100, Math.round((n / d) * 100)));
}
function promotionCopy(prog) {
    if (!prog)
        return "";
    if (prog.unlockedMax === "INTERN") {
        const need = Math.max(0, prog.INTERN.neededForNext - prog.INTERN.passed);
        return need > 0
            ? `Promotion path: Solve ${need} more Intern tickets to unlock Junior.`
            : `You're ready to move! Junior tier is available.`;
    }
    if (prog.unlockedMax === "JUNIOR") {
        const need = Math.max(0, prog.JUNIOR.neededForNext - prog.JUNIOR.passed);
        return need > 0
            ? `Promotion path: Solve ${need} more Junior tickets to unlock Senior.`
            : `You're ready to move! Senior tier is available.`;
    }
    return `Top of the ladder! Keep sharpening your edge at Senior.`;
}
function Badge({ text, tone }) {
    return _jsx("span", { className: `badge ${tone}`, children: text });
}
function TicketWallet({ tier }) {
    const t = TIER_TICKETS[tier];
    return (_jsxs("div", { className: "ticketWallet", children: [_jsx("span", { className: "twIcon", children: "\uD83C\uDF9F" }), _jsxs("div", { className: "twMeta", children: [_jsx("div", { className: "twLabel", children: "Tickets" }), _jsx("div", { className: "twValue", children: t })] })] }));
}
function ProgressBar({ value, total, color }) {
    const w = pct(value, total);
    return (_jsx("div", { className: "progOuter", children: _jsx("div", { className: "progInner", style: { width: `${w}%`, backgroundColor: color } }) }));
}
function ProblemCard({ p, locked }) {
    const tone = p.difficulty.toLowerCase() === "easy"
        ? "easy"
        : p.difficulty.toLowerCase() === "medium"
            ? "medium"
            : p.difficulty.toLowerCase() === "hard"
                ? "hard"
                : "neutral";
    return (_jsxs("div", { className: `probCard ${locked ? "locked" : ""}`, children: [locked && _jsx("div", { className: "lockVeil" }), _jsxs("div", { className: "probTop", children: [_jsx("div", { className: "probTitle", children: locked ? (_jsx("span", { className: "probText lockedTitle", title: "Locked", children: p.title })) : (_jsx(Link, { to: `/problems/${p.id}`, className: "probLink", children: p.title })) }), _jsx("div", { className: "probIcon", children: locked ? "🔒" : "➡️" })] }), _jsxs("div", { className: "probBadges", children: [_jsx(Badge, { text: p.difficulty, tone: tone }), _jsx(Badge, { text: p.tier, tone: "neutral" })] })] }));
}
function TierTrack({ tier, problems, locked, progress, }) {
    const theme = TIER_THEME[tier];
    const solved = progress?.passed ?? 0;
    const total = progress?.total ?? problems.length ?? 0;
    return (_jsxs("section", { className: "tierSection", children: [_jsxs("div", { className: "tierHeader", style: { background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }, children: [_jsxs("div", { className: "tierHeadL", children: [_jsx("span", { className: "tierEmoji", children: theme.emoji }), _jsxs("div", { className: "tierHeadMeta", children: [_jsx("div", { className: "tierTitle", children: TIER_LABEL[tier] }), _jsx("div", { className: "tierSub", children: locked ? "Locked — earn your promotion to enter." : "Unlocked — pick a ticket and go!" })] })] }), _jsxs("div", { className: "tierCount", children: [solved, "/", total] })] }), _jsx(ProgressBar, { value: solved, total: total || 1, color: theme.bar }), locked && (_jsx("div", { className: "lockedMsg", children: "This level is locked. Clear the promotion requirement in your current tier to unlock it." })), _jsxs("div", { className: "cardGrid", children: [(problems ?? []).map((p) => (_jsx(ProblemCard, { p: p, locked: locked }, p.id))), !locked && (problems?.length ?? 0) === 0 && (_jsx("div", { className: "emptyCard", children: "No tickets in this tier yet." })), locked && (problems?.length ?? 0) === 0 && (_jsx("div", { className: "emptyCard muted", children: "Locked content" }))] })] }));
}
export default function ProblemsList() {
    const api = useApi();
    const noStoreQuery = {
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: "always",
        refetchOnReconnect: "always",
    };
    const fetchMe = async () => {
        try {
            return await api("/me");
        }
        catch (e) {
            if (e?.status === 401)
                return undefined;
            throw e;
        }
    };
    const { data: me } = useQuery({
        queryKey: ["me"],
        queryFn: fetchMe,
        ...noStoreQuery,
    });
    const userKey = me?.id ?? "anon";
    const fetchTier = async (tier) => {
        try {
            return await api(`/problems?tier=${tier}`);
        }
        catch (err) {
            if (err?.status === 403)
                return [];
            throw err;
        }
    };
    const { data: prog, isLoading: loadingProg, error: errProg, } = useQuery({
        queryKey: ["progress", userKey],
        queryFn: () => api("/progress"),
        ...noStoreQuery,
    });
    const unlockedJunior = prog?.unlockedMax !== "INTERN";
    const unlockedSenior = prog?.unlockedMax === "SENIOR";
    const { data: intern, isLoading: loadingIntern } = useQuery({
        queryKey: ["problems", "INTERN", prog?.unlockedMax, userKey],
        queryFn: () => fetchTier("INTERN"),
        enabled: !!prog,
        retry: false,
        ...noStoreQuery,
    });
    const { data: junior, isLoading: loadingJunior } = useQuery({
        queryKey: ["problems", "JUNIOR", prog?.unlockedMax, userKey],
        queryFn: () => fetchTier("JUNIOR"),
        enabled: !!prog && unlockedJunior,
        retry: false,
        ...noStoreQuery,
    });
    const { data: senior, isLoading: loadingSenior } = useQuery({
        queryKey: ["problems", "SENIOR", prog?.unlockedMax, userKey],
        queryFn: () => fetchTier("SENIOR"),
        enabled: !!prog && unlockedSenior,
        retry: false,
        ...noStoreQuery,
    });
    const currentTier = prog?.unlockedMax;
    const heroTheme = currentTier ? TIER_THEME[currentTier] : TIER_THEME.INTERN;
    return (_jsxs("main", { className: "careerPage", children: [_jsx("style", { children: `
/* ===== Page scaffold ===== */
.careerPage { max-width: 1120px; margin: 0 auto; padding: 24px 16px; }
.hero {
  position: relative; overflow: hidden; border-radius: 20px;
  padding: 28px; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.heroGlow {
  position: absolute; inset: 0; background: radial-gradient(1200px 400px at 80% -10%, rgba(255,255,255,.6), transparent 50%);
  opacity: .2; pointer-events: none;
}
.heroRow { position: relative; display: flex; gap: 16px; align-items: center; justify-content: space-between; }
.heroTitle { font-size: 28px; font-weight: 800; letter-spacing: .2px; }
.heroKicker { font-size: 12px; opacity: .9; }
.heroSub { margin-top: 6px; font-size: 14px; opacity: .95; }

/* Ticket wallet */
.ticketWallet {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,0.75);
  box-shadow: 0 1px 5px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.06);
  backdrop-filter: blur(6px);
}
.twIcon { font-size: 22px; }
.twMeta { line-height: 1.1; }
.twLabel { font-size: 11px; color: #475569; }
.twValue { font-size: 14px; font-weight: 700; color: #111827; }

/* Sections */
.sectionStack { display: flex; flex-direction: column; gap: 28px; margin-top: 24px; }

/* Tier header */
.tierSection { display: flex; flex-direction: column; gap: 10px; }
.tierHeader {
  color: #fff; border-radius: 16px; padding: 14px 16px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}
.tierHeadL { display: flex; align-items: center; gap: 10px; }
.tierEmoji { font-size: 22px; }
.tierHeadMeta { line-height: 1.15; }
.tierTitle { font-weight: 800; font-size: 18px; }
.tierSub { font-size: 12px; opacity: .95; }
.tierCount { font-weight: 700; font-size: 14px; }

/* Progress bar */
.progOuter { height: 8px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
.progInner { height: 8px; border-radius: 999px; }

/* Locked message */
.lockedMsg {
  border: 1px solid #e5e7eb; background: #f9fafb; color: #4b5563;
  border-radius: 12px; padding: 12px; font-size: 14px;
}

/* Grid of cards */
.cardGrid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

/* Problem card */
.probCard {
  position: relative;
  border-radius: 16px; border: 1px solid #e5e7eb; background: #fff;
  padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  display: flex; flex-direction: column; gap: 10px; min-height: 120px;
  transition: transform .15s ease, box-shadow .15s ease;
}
.probCard:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
.probCard.locked { filter: grayscale(0.12) opacity(0.75); }
.lockVeil { position: absolute; inset: 0; border-radius: 16px; background: rgba(0,0,0,0.03); pointer-events: none; }

.probTop { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.probLink { font-weight: 700; color: #111827; text-decoration: none; }
.probLink:hover { text-decoration: underline; }
.lockedTitle { color: #6b7280; font-weight: 700; }
.probIcon { font-size: 18px; line-height: 1; }

.probBadges { display: flex; align-items: center; gap: 6px; }

/* Badges */
.badge {
  display: inline-block; font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 999px; border: 1px solid;
}
.badge.easy { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
.badge.medium { background: #fffbeb; color: #92400e; border-color: #fde68a; }
.badge.hard { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.badge.neutral { background: #f9fafb; color: #374151; border-color: #e5e7eb; }

/* Helpers */
.emptyCard {
  border-radius: 16px; border: 1px solid #e5e7eb; background: #fff; padding: 18px;
  color: #6b7280; font-size: 14px; text-align: center;
}
.emptyCard.muted { color: #9ca3af; }

/* Header text fallback states */
.hint { font-size: 12px; color: #e5e7eb; }
` }), _jsxs("div", { className: "hero", style: {
                    background: `linear-gradient(90deg, ${heroTheme.from}, ${heroTheme.to})`,
                }, children: [_jsx("div", { className: "heroGlow" }), _jsxs("div", { className: "heroRow", children: [_jsxs("div", { children: [_jsx("div", { className: "heroKicker", children: "Career Ladder" }), _jsx("div", { className: "heroTitle", children: currentTier ? `${TIER_LABEL[currentTier]} Engineer` : "Loading…" }), _jsx("div", { className: "heroSub", children: loadingProg ? "Fetching your progress…" : errProg ? "Failed to load progress." : promotionCopy(prog) })] }), currentTier && _jsx(TicketWallet, { tier: currentTier })] })] }), _jsxs("div", { className: "sectionStack", children: [_jsx(TierTrack, { tier: "INTERN", problems: intern ?? [], locked: false, progress: prog?.INTERN }), _jsx(TierTrack, { tier: "JUNIOR", problems: unlockedJunior ? (junior ?? []) : [], locked: !unlockedJunior, progress: prog?.JUNIOR }), _jsx(TierTrack, { tier: "SENIOR", problems: unlockedSenior ? (senior ?? []) : [], locked: !unlockedSenior, progress: prog?.SENIOR })] }), (loadingIntern || loadingJunior || loadingSenior) && (_jsx("p", { className: "hint", "aria-live": "polite", children: "Loading tickets\u2026" }))] }));
}
