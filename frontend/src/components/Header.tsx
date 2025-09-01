import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import type { User } from "../lib/types";

export default function Header() {
  const { token, logout } = useAuth();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Hide header on the landing route
  if (pathname === "/") return null;

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/me"),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const isAuthed = !!token;
  const displayName = me?.email?.split("@")[0] || me?.email || "Account";
  const email = me?.email || "";
  const initial = (displayName || "U").slice(0, 1).toUpperCase();

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

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  const css = `
/* Base (desktop/tablet) */
.navbar { background:#fff; border-bottom:1px solid #e5e7eb; }
.navInner { display:flex; align-items:center; gap:12px; padding:10px 16px; min-width:0; }
.brand { font-weight:900; letter-spacing:.2px; color:#111827; white-space:nowrap; }
.navLinks { display:flex; gap:10px; flex-wrap:wrap; }
.navlink { display:inline-block; padding:8px 12px; border-radius:10px; border:1px solid #e5e7eb; white-space:nowrap; }
.navlink.active { background:#f3f4f6; }
.spacer { flex:1; }
.userMenu { display:flex; align-items:center; gap:10px; }
.userMenu .navlink { white-space:nowrap; } /* keep single-line pills */

/* Optional (avatar/menu styles if not already elsewhere) */
.userButton { background:#f3f4f6; border:1px solid #e5e7eb; border-radius:999px; padding:2px; }
.avatar { display:inline-flex; width:32px; height:32px; align-items:center; justify-content:center; border-radius:999px; font-weight:800; background:#111827; color:#fff; }
.menuPanel { position:absolute; margin-top:8px; right:16px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.08); min-width:220px; }
.menuHeader { padding:10px 12px; border-bottom:1px solid #e5e7eb; }
.menuName { font-weight:800; }
.menuEmail { color:#6b7280; font-size:12px; }
.menuItem { display:block; width:100%; text-align:left; padding:10px 12px; border:0; background:transparent; cursor:pointer; }
.menuItem:hover { background:#f9fafb; }
.menuItem.danger { color:#b91c1c; }

/* Mobile: stack into three rows: brand, primary links, auth */
@media (max-width: 560px) {
  /* Switch to grid just on small screens */
  .navInner {
    display: grid;
    grid-template-columns: 1fr auto;       /* links | user menu */
    grid-template-areas:
      "brand brand"
      "nav   user";
    align-items: center;
    gap: 8px;
    padding: 8px 12px;                     /* slightly tighter */
  }

  /* Row 1: brand centered across full width */
  .brand {
    grid-area: brand;
    text-align: center;
    flex: unset;                            /* override flex defaults */
  }

  /* Row 2: links (centered) + user menu (right) */
  .navLinks {
    grid-area: nav;
    justify-content: center;
    flex: unset;
  }

  .userMenu {
    grid-area: user;
    justify-content: end;
    flex: unset;
  }

  /* Spacer not needed on mobile */
  .spacer { display: none; }

  /* Compact pills */
  .navlink { padding: 6px 10px; font-size: 14px; }
}
`;

  return (
    <header className="navbar">
      <style>{css}</style>
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
