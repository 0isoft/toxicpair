import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
function AdminOnly({ children }) {
    const { token } = useAuth();
    const api = useApi();
    const { data: me, isLoading } = useQuery({
        queryKey: ["me"],
        queryFn: () => api("/me"), // ← type the API call too
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
    });
    const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase();
    if (!token)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (isLoading)
        return _jsx("main", { style: { padding: 16 }, children: "Loading\u2026" });
    if (!me || me.email?.toLowerCase() !== adminEmail)
        return _jsx(Navigate, { to: "/", replace: true });
    return _jsx(_Fragment, { children: children });
}
export default function AdminKPIs() {
    const api = useApi();
    const [days, setDays] = React.useState(30);
    const { data, isLoading, error } = useQuery({
        queryKey: ["admin-kpis", days],
        queryFn: () => api(`/admin/kpis?days=${days}`),
        staleTime: 60_000,
    });
    return (_jsx(AdminOnly, { children: _jsxs("main", { style: { padding: "16px 12px" }, children: [_jsx("h1", { style: { margin: 0 }, children: "Admin KPIs" }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }, children: [_jsx("label", { children: "Range (days)" }), _jsx("input", { type: "number", min: 1, max: 365, value: days, onChange: (e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 30))) })] }), isLoading && _jsx("div", { children: "Loading\u2026" }), error && _jsx("pre", { style: { color: "tomato" }, children: String(error) }), data && (_jsxs(_Fragment, { children: [_jsxs("section", { style: { marginTop: 12 }, children: [_jsx("h2", { children: "Totals" }), _jsx("table", { children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { children: "Users" }), _jsx("td", { children: _jsx("b", { children: data.totals.users }) })] }), _jsxs("tr", { children: [_jsx("td", { children: "Problems" }), _jsx("td", { children: _jsx("b", { children: data.totals.problems }) })] }), _jsxs("tr", { children: [_jsx("td", { children: "Attempts" }), _jsx("td", { children: _jsx("b", { children: data.totals.attempts }) })] }), _jsxs("tr", { children: [_jsx("td", { children: "Passed" }), _jsx("td", { children: _jsx("b", { children: data.totals.passed }) })] })] }) })] }), _jsxs("section", { style: { marginTop: 16 }, children: [_jsxs("h2", { children: ["New Users by Day (last ", data.days, "d)"] }), _jsx(SimpleTable, { rows: data.newUsersByDay, cols: [["d", "Day"], ["n", "New Users"]] })] }), _jsxs("section", { style: { marginTop: 16 }, children: [_jsx("h2", { children: "DAU (via attempts)" }), _jsx(SimpleTable, { rows: data.dau, cols: [["d", "Day"], ["n", "Active Users"]] })] }), _jsxs("section", { style: { marginTop: 16 }, children: [_jsx("h2", { children: "Attempts by Day" }), _jsx(SimpleTable, { rows: data.attemptsByDay, cols: [["d", "Day"], ["total", "Attempts"]] })] }), _jsxs("section", { style: { marginTop: 16 }, children: [_jsx("h2", { children: "Pass Rate by Day" }), _jsx(SimpleTable, { rows: data.passRateByDay, cols: [["d", "Day"], ["total", "Total"], ["passed", "Passed"], ["pass_rate_pct", "Pass %"]] })] })] }))] }) }));
}
function SimpleTable({ rows, cols }) {
    return (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { style: { borderCollapse: "collapse", minWidth: 420 }, children: [_jsx("thead", { children: _jsx("tr", { children: cols.map(([_, label]) => (_jsx("th", { style: thTdStyle, children: label }, String(label)))) }) }), _jsx("tbody", { children: rows.map((r, i) => (_jsx("tr", { children: cols.map(([k]) => (_jsx("td", { style: thTdStyle, children: formatCell(r[k]) }, String(k)))) }, i))) })] }) }));
}
const thTdStyle = {
    border: "1px solid #2b2e5a",
    padding: "6px 8px",
    fontSize: 13,
};
function formatCell(v) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v))
        return v.slice(0, 10);
    return String(v);
}
