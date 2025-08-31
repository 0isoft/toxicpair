import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Outlet } from "react-router-dom";
import Header from "./components/Header";
import Splash from "./pages/Splash";
import ProblemsList from "./pages/ProblemsList";
import ProblemDetail from "./pages/ProblemDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Legal from "./pages/Legal";
import AdminKPIs from "./pages/adminKPIs";
function Shell() {
    return (_jsxs("div", { children: [_jsx(Header, {}), _jsx("div", { className: "page-wrap", children: _jsx(Outlet, {}) })] }));
}
export default function App() {
    return (_jsx(Routes, { children: _jsxs(Route, { element: _jsx(Shell, {}), children: [_jsx(Route, { path: "/", element: _jsx(Splash, {}) }), _jsx(Route, { path: "/problems", element: _jsx(ProblemsList, {}) }), _jsx(Route, { path: "/problems/:id", element: _jsx(ProblemDetail, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/profile", element: _jsx(Profile, {}) }), _jsx(Route, { path: "legal", element: _jsx(Legal, {}) }), _jsx(Route, { path: "admin", element: _jsx(AdminKPIs, {}) })] }) }));
}
