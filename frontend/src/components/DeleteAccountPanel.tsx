import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import { auth } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

export default function DeleteAccountPanel() {
  const { token, logout } = useAuth();
  const api = useApi();
  const [mode, setMode] = useState<"password" | "oauth">("password");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function deleteWithOAuth() {
    // get fresh Firebase idToken; if not signed, force a short reauth popup
    const prov = new GoogleAuthProvider(); // or choose based on your UI; fallback to GitHub if desired
    const cred = await signInWithPopup(auth, prov);
    return cred.user.getIdToken(true);
  }

  async function onDelete() {
    if (!token) return;
    setErr(null); setLoading(true);
    try {
      let body: any = {};
      if (mode === "password") {
        body.password = password;
      } else {
        body.idToken = await deleteWithOAuth();
      }
      await api<void>("/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      await logout(); // nuke local state + cookie cleared by server
      window.location.href = "/"; // hard nav so header updates immediately
    } catch (e: any) {
      setErr(e?.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel danger">
      <div className="panelHead">
        <h3 className="panelTitle">Danger Zone</h3>
        <div className="panelSub">Irreversible. Deletes your account and all data.</div>
      </div>

      <div className="dangerBody">
        <div className="modeRow">
          <label><input type="radio" checked={mode==="password"} onChange={()=>setMode("password")} /> I signed up with email/password</label>
          <label><input type="radio" checked={mode==="oauth"} onChange={()=>setMode("oauth")} /> I signed up with Google/GitHub</label>
        </div>

        {mode === "password" && (
          <input
            type="password"
            className="input"
            placeholder="Confirm your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {err && <div className="err">{err}</div>}

        <button className="btn danger" onClick={onDelete} disabled={loading}>
          {loading ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </section>
  );
}
