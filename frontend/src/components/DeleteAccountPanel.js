import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import { auth } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
export default function DeleteAccountPanel() {
    const { token, logout } = useAuth();
    const api = useApi();
    const [mode, setMode] = useState("password");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    async function deleteWithOAuth() {
        // get fresh Firebase idToken; if not signed, force a short reauth popup
        const prov = new GoogleAuthProvider(); // or choose based on your UI; fallback to GitHub if desired
        const cred = await signInWithPopup(auth, prov);
        return cred.user.getIdToken(true);
    }
    async function onDelete() {
        if (!token)
            return;
        setErr(null);
        setLoading(true);
        try {
            let body = {};
            if (mode === "password") {
                body.password = password;
            }
            else {
                body.idToken = await deleteWithOAuth();
            }
            await api("/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            await logout(); // nuke local state + cookie cleared by server
            window.location.href = "/"; // hard nav so header updates immediately
        }
        catch (e) {
            setErr(e?.message || "Failed to delete account.");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("section", { className: "panel danger", children: [_jsxs("div", { className: "panelHead", children: [_jsx("h3", { className: "panelTitle", children: "Danger Zone" }), _jsx("div", { className: "panelSub", children: "Irreversible. Deletes your account and all data." })] }), _jsxs("div", { className: "dangerBody", children: [_jsxs("div", { className: "modeRow", children: [_jsxs("label", { children: [_jsx("input", { type: "radio", checked: mode === "password", onChange: () => setMode("password") }), " I signed up with email/password"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", checked: mode === "oauth", onChange: () => setMode("oauth") }), " I signed up with Google/GitHub"] })] }), mode === "password" && (_jsx("input", { type: "password", className: "input", placeholder: "Confirm your password", value: password, onChange: (e) => setPassword(e.target.value) })), err && _jsx("div", { className: "err", children: err }), _jsx("button", { className: "btn danger", onClick: onDelete, disabled: loading, children: loading ? "Deleting…" : "Delete my account" })] })] }));
}
