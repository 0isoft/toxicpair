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
import ChunkReloadBoundary from "./ChunkReloadBoundary"; // ✅

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
  return (
    <ChunkReloadBoundary>   {/* ✅ one-time auto-reload on stale chunk */}
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
    </ChunkReloadBoundary>
  );
}
