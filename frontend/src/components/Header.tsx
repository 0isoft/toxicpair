import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import type { User } from "../lib/types";

export default function Header() {
  const { token, logout } = useAuth();
  const api = useApi();

  const { data: me } = useQuery({
    queryKey: ["me", token],
    queryFn: () => api<User>("/me"),
    enabled: !!token, // only fetch when logged in
  });

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold">ToxicPair</Link>
        <nav className="flex items-center gap-4 text-sm">
          <NavLink to="/problems" className="hover:underline">Problems</NavLink>
          {!token && (
            <>
              <NavLink to="/login" className="hover:underline">Log in</NavLink>
              <NavLink to="/register" className="hover:underline">Register</NavLink>
            </>
          )}
          {token && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">{me?.email ?? "…"}</span>
              <button onClick={logout} className="px-2 py-1 border rounded">Logout</button>
            </div>
          )}
          {token && <NavLink to="/profile" className="text-sm hover:underline">Profile</NavLink>}

        </nav>
      </div>
    </header>
  );
}
