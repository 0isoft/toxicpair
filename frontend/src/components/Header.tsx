import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import type { User } from "../lib/types";
import { useLocation } from "react-router-dom";

export default function Header() {
  const { token, logout } = useAuth();
  const api = useApi();
  const qc = useQueryClient();

  const { pathname } = useLocation();
  // + hide the header on the landing route
  if (pathname === "/") return null;

  const { data: me } = useQuery({
    queryKey: ["me"],                 // stable key
    queryFn: () => api<User>("/me"),
    enabled: !!token,                 // fetch only when we have a token
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  
  const isAuthed = !!token;
  const navigate = useNavigate();

  const displayName = me?.email?.split("@")[0] || me?.email || "Account";
  const email = me?.email || "";
  const initial = (displayName || "U").slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="navbar">
      <div className="navInner">
        <Link to="/" className="brand">Agile Hostile</Link>

        <nav className="navLinks" aria-label="Primary">
          <NavLink to="/" end className={({isActive}) => "navlink" + (isActive ? " active" : "")}>
            Home
          </NavLink>
          <NavLink to="/problems" className={({isActive}) => "navlink" + (isActive ? " active" : "")}>
            Problems
          </NavLink>
        </nav>

        <div className="spacer" />

        <div className="userMenu" ref={boxRef}>
          {isAuthed ? (
            <>
              <button
                className="userButton"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
              >
                <span className="avatar">{initial}</span>
              </button>
              {open && (
                <div className="menuPanel" role="menu">
                  <div className="menuHeader">
                    <div className="menuName">{displayName}</div>
                    {email && <div className="menuEmail">{email}</div>}
                  </div>
                  <NavLink
                    to="/profile"
                    className="menuItem"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </NavLink>
                  <button
                    className="menuItem danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <NavLink to="/login" className="navlink">Log in</NavLink>
              <NavLink to="/register" className="navlink">Register</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
