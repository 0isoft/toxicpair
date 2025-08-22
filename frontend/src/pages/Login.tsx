import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try { await login(email, password); nav("/problems"); }
    catch (e: any) { setErr(e.message || "Login failed"); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <h2 className="text-xl font-semibold mb-4">Log in</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Email" type="email"
               value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Password" type="password"
               value={password} onChange={e => setPassword(e.target.value)} />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button disabled={loading} className="px-4 py-2 rounded bg-gray-900 text-white w-full">
          {loading ? "…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
