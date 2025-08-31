import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useNavigate, Link } from "react-router-dom";
import OAuthButtons from "../components/OAuthButtons";
export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(false);
    async function onSubmit(e) {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            await login(email, password);
            nav("/problems");
        }
        catch (e) {
            setErr(e.message || "Login failed");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("main", { className: "authPage", children: [_jsx("style", { children: authStyles }), _jsxs("div", { className: "hero", style: { background: "linear-gradient(90deg, #6366f1, #22d3ee)" }, children: [_jsx("div", { className: "heroGlow" }), _jsx("div", { className: "heroRow", children: _jsxs("div", { children: [_jsx("div", { className: "heroKicker", children: "Welcome back" }), _jsx("div", { className: "heroTitle", children: "Log in to Agile Hostile" }), _jsx("div", { className: "heroSub", children: "Pair with chaos. Ship anyway." })] }) })] }), _jsx("section", { className: "authWrap", children: _jsxs("div", { className: "authCard", children: [_jsx("h3", { className: "cardTitle", children: "Continue with" }), _jsx(OAuthButtons, {}), _jsx("div", { className: "orDivider", children: _jsx("span", { children: "or" }) }), _jsxs("form", { onSubmit: onSubmit, className: "form", children: [_jsxs("label", { className: "field", children: [_jsx("span", { className: "label", children: "Email" }), _jsx("input", { className: "input", placeholder: "you@company.com", type: "email", value: email, onChange: e => setEmail(e.target.value), autoComplete: "email", required: true })] }), _jsxs("label", { className: "field", children: [_jsx("span", { className: "label", children: "Password" }), _jsx("input", { className: "input", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", type: "password", value: password, onChange: e => setPassword(e.target.value), autoComplete: "current-password", required: true })] }), err && _jsx("div", { className: "errorBox", children: err }), _jsx("button", { disabled: loading, className: "btn primary wfull", type: "submit", children: loading ? "…" : "Log in" })] }), _jsxs("div", { className: "metaRow", children: ["No account? ", _jsx(Link, { to: "/register", className: "link", children: "Create one" })] })] }) })] }));
}
const authStyles = `
.authPage { max-width: 1120px; margin: 0 auto; padding: 24px 16px; color: #111827; }

/* Hero */
.hero { position: relative; overflow: hidden; border-radius: 20px; padding: 24px; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.heroGlow { position: absolute; inset: 0; background: radial-gradient(1200px 400px at 80% -10%, rgba(255,255,255,.6), transparent 50%); opacity: .2; pointer-events: none; }
.heroRow { position: relative; display: flex; align-items: center; justify-content: space-between; }
.heroKicker { font-size: 12px; opacity: .9; }
.heroTitle { font-size: 28px; font-weight: 800; letter-spacing: .2px; }
.heroSub { margin-top: 6px; font-size: 14px; opacity: .95; }

/* Card */
.authWrap { display: flex; justify-content: center; padding: 18px 0; }
.authCard { width: 100%; max-width: 420px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.05); padding: 16px; }
.cardTitle { margin: 0 0 8px 0; font-weight: 800; font-size: 16px; }

/* OAuth buttons (works with OAuthButtons using .btn) */
.btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:10px 12px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; font-weight:800; }
.btn:hover { background:#f8fafc; text-decoration:none; }
.wfull { width:100%; }
.space-y-2 > * + * { margin-top: 8px; } /* in case your OAuthButtons uses this utility class */

/* Divider */
.orDivider { position: relative; text-align:center; margin: 12px 0; color:#64748b; font-size:12px; }
.orDivider::before, .orDivider::after {
  content:""; position:absolute; top:50%; width:40%; height:1px; background:#e5e7eb;
}
.orDivider::before { left:0; }
.orDivider::after  { right:0; }

/* Form */
.form { display:flex; flex-direction:column; gap:10px; }
.field { display:flex; flex-direction:column; gap:6px; }
.label { font-size:12px; color:#475569; font-weight:700; }
.input {
  width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; font-size:14px;
  outline:none; transition: border-color .15s ease, box-shadow .15s ease;
}
.input:focus { border-color:#8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.15); }

/* Submit */
.btn.primary { background:#111827; color:#fff; border-color:#111827; }
.btn.primary:hover { background:#1f2937; }

/* Meta */
.metaRow { margin-top: 10px; font-size: 13px; color:#6b7280; text-align:center; }
.link { color:#0ea5e9; text-decoration: underline; }

/* Error */
.errorBox { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:8px 10px; border-radius:10px; font-size:13px; }
`;
