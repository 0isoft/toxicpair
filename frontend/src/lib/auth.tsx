import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type AuthCtx = {
  token: string | null;
  setToken: (t: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  refresh: () => Promise<string | null>; // <-- fix: return the new token (or null)
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const API = import.meta.env.VITE_API_BASE as string;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(null);

  async function login(email: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Invalid credentials");
    const data = await res.json();
    setToken(data.accessToken ?? null);
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function register(email: string, password: string) {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Registration failed");
    const data = await res.json();
    setToken(data.accessToken ?? null);
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  // Return the fresh token (or null) so callers can retry immediately with it
  async function refresh(): Promise<string | null> {
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      setToken(null);
      qc.invalidateQueries({ queryKey: ["me"] });
      return null;
    }
    const data = await res.json();
    const newToken = data.accessToken ?? null;
    setToken(newToken);
    qc.invalidateQueries({ queryKey: ["me"] });
    return newToken;
  }

  function logout() {
    setToken(null);
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  // bootstrap from refresh cookie on mount
  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  return (
    <Ctx.Provider value={{ token, setToken, login, register, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
}

// <-- export the hook so other files can import { useAuth } from "../lib/auth";
export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
