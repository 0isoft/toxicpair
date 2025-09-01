// App.tsx
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
import {useAuth} from "./lib/auth"

function Shell() {
  return (
    <div>
      <Header />
      <div className="page-wrap">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  const { booted } = useAuth();
  if (!booted) {
    // optional spinner/skeleton; returning null is fine too
    return null;
  }
  return (
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Splash />} />
          <Route path="/problems" element={<ProblemsList />} />
          <Route path="/problems/:id" element={<ProblemDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="legal" element={<Legal />} />
          <Route path="admin" element={<AdminKPIs />} />
        </Route>
      </Routes>
  );
}
