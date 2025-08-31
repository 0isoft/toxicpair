import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/api";
import { useLocation } from "react-router-dom";
export default function Header() {
    const { token, logout } = useAuth();
    const api = useApi();
    const qc = useQueryClient();
    const { pathname } = useLocation();
    // + hide the header on the landing route
    if (pathname === "/")
        return null;
    const { data: me } = useQuery({
        queryKey: ["me"], // stable key
        queryFn: () => api("/me"),
        enabled: !!token, // fetch only when we have a token
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
    const boxRef = useRef(null);
    useEffect(() => {
        const onDocClick = (e) => {
            if (!boxRef.current?.contains(e.target))
                setOpen(false);
        };
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onKey);
        };
    }, []);
    return (_jsx("header", { className: "navbar", children: _jsxs("div", { className: "navInner", children: [_jsx(Link, { to: "/", className: "brand", children: "Agile Hostile" }), _jsxs("nav", { className: "navLinks", "aria-label": "Primary", children: [_jsx(NavLink, { to: "/", end: true, className: ({ isActive }) => "navlink" + (isActive ? " active" : ""), children: "Home" }), _jsx(NavLink, { to: "/problems", className: ({ isActive }) => "navlink" + (isActive ? " active" : ""), children: "Problems" })] }), _jsx("div", { className: "spacer" }), _jsx("div", { className: "userMenu", ref: boxRef, children: isAuthed ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "userButton", "aria-haspopup": "menu", "aria-expanded": open, onClick: () => setOpen(v => !v), children: _jsx("span", { className: "avatar", children: initial }) }), open && (_jsxs("div", { className: "menuPanel", role: "menu", children: [_jsxs("div", { className: "menuHeader", children: [_jsx("div", { className: "menuName", children: displayName }), email && _jsx("div", { className: "menuEmail", children: email })] }), _jsx(NavLink, { to: "/profile", className: "menuItem", role: "menuitem", onClick: () => setOpen(false), children: "Profile" }), _jsx("button", { className: "menuItem danger", role: "menuitem", onClick: handleLogout, children: "Log out" })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(NavLink, { to: "/login", className: "navlink", children: "Log in" }), _jsx(NavLink, { to: "/register", className: "navlink", children: "Register" })] })) })] }) }));
}
