import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import type { User } from "../lib/types";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();

type RowN = { d: string; n: number };
type RowTotal = { d: string; total: number };
type RowPass = { d: string; total: number; passed: number; pass_rate_pct: number };

type KPIResponse = {
  days: number;
  totals: { users: number; problems: number; attempts: number; passed: number };
  newUsersByDay: RowN[];
  dau: RowN[];
  attemptsByDay: RowTotal[];
  passRateByDay: RowPass[];
};

function AdminOnly({ children }: { children: React.ReactNode }) {
    const { token } = useAuth();
    const api = useApi();
  
    const { data: me, isLoading } = useQuery<User>({
      queryKey: ["me"],
      queryFn: () => api<User>("/me"),   // ← type the API call too
      enabled: !!token,
      staleTime: 5 * 60 * 1000,
    });
  
    const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase();
  
    if (!token) return <Navigate to="/login" replace />;
    if (isLoading) return <main style={{ padding: 16 }}>Loading…</main>;
    if (!me || me.email?.toLowerCase() !== adminEmail) return <Navigate to="/" replace />;
  
    return <>{children}</>;
  }

export default function AdminKPIs() {
  const api = useApi();
  const [days, setDays] = React.useState(30);

  const { data, isLoading, error } = useQuery<KPIResponse>({
    queryKey: ["admin-kpis", days],
    queryFn: () => api(`/admin/kpis?days=${days}`),
    staleTime: 60_000,
  });

  return (
    <AdminOnly>
      <main style={{ padding: "16px 12px" }}>
        <h1 style={{ margin: 0 }}>Admin KPIs</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
          <label>Range (days)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) =>
              setDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))
            }
          />
        </div>

        {isLoading && <div>Loading…</div>}
        {error && <pre style={{ color: "tomato" }}>{String(error)}</pre>}

        {data && (
          <>
            <section style={{ marginTop: 12 }}>
              <h2>Totals</h2>
              <table>
                <tbody>
                  <tr><td>Users</td><td><b>{data.totals.users}</b></td></tr>
                  <tr><td>Problems</td><td><b>{data.totals.problems}</b></td></tr>
                  <tr><td>Attempts</td><td><b>{data.totals.attempts}</b></td></tr>
                  <tr><td>Passed</td><td><b>{data.totals.passed}</b></td></tr>
                </tbody>
              </table>
            </section>

            <section style={{ marginTop: 16 }}>
              <h2>New Users by Day (last {data.days}d)</h2>
              <SimpleTable rows={data.newUsersByDay} cols={[["d","Day"],["n","New Users"]]} />
            </section>

            <section style={{ marginTop: 16 }}>
              <h2>DAU (via attempts)</h2>
              <SimpleTable rows={data.dau} cols={[["d","Day"],["n","Active Users"]]} />
            </section>

            <section style={{ marginTop: 16 }}>
              <h2>Attempts by Day</h2>
              <SimpleTable rows={data.attemptsByDay} cols={[["d","Day"],["total","Attempts"]]} />
            </section>

            <section style={{ marginTop: 16 }}>
              <h2>Pass Rate by Day</h2>
              <SimpleTable
                rows={data.passRateByDay}
                cols={[["d","Day"],["total","Total"],["passed","Passed"],["pass_rate_pct","Pass %"]]}
              />
            </section>
          </>
        )}
      </main>
    </AdminOnly>
  );
}

function SimpleTable({ rows, cols }:{
  rows: any[], cols: [keyof any, string][]
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", minWidth: 420 }}>
        <thead>
          <tr>
            {cols.map(([_, label]) => (
              <th key={String(label)} style={thTdStyle}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map(([k]) => (
                <td key={String(k)} style={thTdStyle}>{formatCell(r[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thTdStyle: React.CSSProperties = {
  border: "1px solid #2b2e5a",
  padding: "6px 8px",
  fontSize: 13,
};

function formatCell(v: any) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return String(v);
}