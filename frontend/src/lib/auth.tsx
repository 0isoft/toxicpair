import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type AuthCtx = {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
  loginWithFirebaseIdToken: (idToken: string) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

// allow local dev fallback, strip trailing slash
const API = (import.meta.env.VITE_API_BASE || "http://localhost:3000/api").replace(/\/$/, "");
const SUPPRESS_REFRESH_KEY = "ah_suppress_refresh";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(null);

  async function login(email: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => "Login failed"));
    const data = await res.json();
    setToken(data.accessToken ?? null);
  }

  async function register(email: string, password: string) {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => "Register failed"));
    const data = await res.json();
    setToken(data.accessToken ?? null);
  }

  async function loginWithFirebaseIdToken(idToken: string) {
    const res = await fetch(`${API}/auth/firebase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error(await res.text().catch(() => "OAuth exchange failed"));
    const data = await res.json();
    setToken(data.accessToken ?? null);
  }

  async function refresh() {
    if (localStorage.getItem(SUPPRESS_REFRESH_KEY)) return null;
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    setToken(data.accessToken ?? null);
    return data.accessToken ?? null;
  }

  async function logout() {
    localStorage.setItem(SUPPRESS_REFRESH_KEY, "1");
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      setToken(null);
      qc.clear();
      setTimeout(() => localStorage.removeItem(SUPPRESS_REFRESH_KEY), 2000);
    }
  }

  useEffect(() => { refresh().catch(() => void 0); }, []);

  return (
    <Ctx.Provider value={{ token, setToken, login, register, refresh, logout, loginWithFirebaseIdToken }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
