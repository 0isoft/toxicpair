// src/pages/Profile.tsx
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import type { User, AttemptSummary } from "../lib/types";
import { Link } from "react-router-dom";
import DeleteAccountPanel from "../components/DeleteAccountPanel";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();


function fmtDate(d?: string | number | Date) {
  if (!d) return "—";
  const dt = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  return dt.toLocaleString();
}

function pct(n: number, d: number) {
  if (!d || d <= 0) return 0;
  return Math.round((n / d) * 100);
}

function DifficultyBadge({ value }: { value?: string }) {
  const v = (value || "").toLowerCase();
  const tone = v === "easy" ? "easy" : v === "medium" ? "medium" : v === "hard" ? "hard" : "neutral";
  return <span className={`badge ${tone}`}>{value ?? "-"}</span>;
}

function RoleBadge({ role }: { role?: string }) {
  const admin = (role || "").toUpperCase() === "ADMIN";
  return <span className={`roleBadge ${admin ? "admin" : "user"}`}>{role ?? "USER"}</span>;
}

function Avatar({ email }: { email?: string }) {
  const letter = (email || "?").trim().charAt(0).toUpperCase();
  return <div className="avatar">{letter}</div>;
}

export default function Profile() {
  const { token } = useAuth();
  const api = useApi();

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/me"),
    enabled: !!token,
  });

  const sumQ = useQuery({
    queryKey: ["attempts-summary"],
    queryFn: () => api<AttemptSummary[]>("/attempts/summary"),
    enabled: !!token,
  });

  if (!token) {
    return (
      <main className="profilePage">
        <style>{baseStyles}</style>
        <div className="hero" style={{ background: "linear-gradient(90deg, #6366f1, #22d3ee)" }}>
          <div className="heroGlow" />
          <div className="heroRow">
            <div>
              <div className="heroKicker">Profile</div>
              <div className="heroTitle">You’re not logged in</div>
              <div className="heroSub">Log in to view your stats, clears, and ongoing tickets.</div>
            </div>
          </div>
        </div>

        <div className="sectionStack">
          <div className="notice">
            You’re not logged in. <Link className="link" to="/login">Log in</Link> to view your profile.
          </div>
        </div>
      </main>
    );
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
    const myEmail    = (me?.email ?? "").trim().toLowerCase();
    const isAdmin =
      (!!myEmail && !!adminEmail && myEmail === adminEmail) ||
      String(me?.role).toUpperCase() === "ADMIN";
  return (
    <main className="profilePage">
      <style>{baseStyles}</style>

      {/* Hero */}
      <div className="hero" style={{ background: "linear-gradient(90deg, #8b5cf6, #ef4444)" }}>
        <div className="heroGlow" />
        <div className="heroRow">
          <div className="heroL">
            <Avatar email={me?.email} />
            <div>
              <div className="heroKicker">Player Card</div>
              <div className="heroTitle">{me?.email ?? "Loading…"}</div>
              <div className="heroSub">
                Member since <strong>{me ? fmtDate(me.createdAt as any) : "—"}</strong> • <RoleBadge role={me?.role as any} />
              </div>
            </div>
          </div>

          <div className="statsRow">
            <StatCard label="Clears" value={passed} hint="Problems passed" />
            <StatCard label="Active Tickets" value={active} hint="Not yet passed" />
            <StatCard label="Pass Rate" value={`${passRate}%`} hint={`${passed}/${total || 0}`} />
            <StatCard label="Last Activity" value={lastActivity ? fmtDate(lastActivity) : "—"} />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="sectionStack">
        <section className="panel">
          <div className="panelHead">
            <h3 className="panelTitle">Cleared Tickets</h3>
            <div className="panelSub">
              {sumQ.isLoading ? "Loading…" : passed ? `You’ve cleared ${passed} unique problems.` : "No clears yet — pick a ticket and go!"}
            </div>
          </div>

          <div className="cardGrid">
            {succeeded.map((r) => (
              <div key={r.problemId} className="probCard">
                <div className="probTop">
                  <Link to={`/problems/${r.problemId}`} className="probLink">{r.problem.title}</Link>
                  <span className="statusPill passed">PASSED</span>
                </div>
                <div className="probBadges">
                  <DifficultyBadge value={r.problem.difficulty} />
                </div>
                <div className="probMeta">Last attempt: {fmtDate(r.submittedAt)}</div>
              </div>
            ))}
            {!sumQ.isLoading && succeeded.length === 0 && (
              <div className="emptyCard">No clears yet.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panelHead">
            <h3 className="panelTitle">Work in Progress</h3>
            <div className="panelSub">
              {sumQ.isLoading ? "Loading…" : active ? `You have ${active} active tickets.` : "All clear! Nothing pending."}
            </div>
          </div>

          <ul className="list">
            {attemptedNotSucceeded.map((r) => (
              <li key={r.problemId} className="listItem">
                <div className="listL">
                  <Link to={`/problems/${r.problemId}`} className="listTitle">{r.problem.title}</Link>
                  <div className="listSub">
                    <DifficultyBadge value={r.problem.difficulty} /> • Last attempt {fmtDate(r.submittedAt)}
                  </div>
                </div>
                <div className="listR">
                  <span className="statusPill neutral">{r.status}</span>
                  <Link to={`/problems/${r.problemId}`} className="actionBtn">Resume</Link>
                </div>
              </li>
            ))}
            {!sumQ.isLoading && attemptedNotSucceeded.length === 0 && (
              <li className="listEmpty">No active tickets.</li>
            )}
          </ul>
        </section>
        <DeleteAccountPanel />
        {isAdmin && (
  <section className="panel">
    <div className="panelHead">
      <h3 className="panelTitle">Admin</h3>
      <div className="panelSub">Private tools</div>
    </div>
    <div style={{ padding: 14 }}>
      <Link to="/admin" className="actionBtn">Open Admin KPIs →</Link>
    </div>
  </section>
)}
       
      </div>
    </main>
  );
}

/* --- tiny presentational helpers --- */
function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="statCard">
      <div className="statValue">{value}</div>
      <div className="statLabel">{label}</div>
      {hint ? <div className="statHint">{hint}</div> : null}
    </div>
  );
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

