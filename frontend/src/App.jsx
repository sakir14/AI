import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import { AuthUserContext, useAuthUser } from "./auth-context";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AccountManagement from "./pages/AccountManagement";
import api from "./api";
import { clearAuth, getAccessToken, getCurrentUser } from "./auth";

import Dashboard from "./pages/Dashboard";
import DataDesa from "./pages/DataDesa";
import InputData from "./pages/InputData";
import AnalisisAI from "./pages/AnalisisAI";
import PetaPrioritas from "./pages/PetaPrioritas";
import Rekomendasi from "./pages/Rekomendasi";
import Simulasi from "./pages/Simulasi";
import Laporan from "./pages/Laporan";

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser);
  const [isChecking, setIsChecking] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsChecking(false);
      return undefined;
    }

    let isActive = true;
    api
      .get("/api/auth/me")
      .then(({ data }) => {
        if (isActive) setUser(data);
      })
      .catch(() => {
        if (isActive) {
          clearAuth();
          setUser(null);
        }
      })
      .finally(() => {
        if (isActive) setIsChecking(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
    } catch {
      clearAuth();
      navigate("/");
      return;
    }
    clearAuth();
    navigate("/");
  }

  if (isChecking) {
    return <div className="auth-loading" role="status">Memeriksa sesi akun…</div>;
  }

  if (!user || !getAccessToken()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return (
    <AuthUserContext.Provider value={user}>
      <div className="app">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </AuthUserContext.Provider>
  );
}

function AdminOnlyRoutes() {
  const user = useAuthUser();
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data-desa" element={<DataDesa />} />
          <Route path="/input-data" element={<InputData />} />
          <Route path="/analisis-ai" element={<AnalisisAI />} />
          <Route path="/peta-prioritas" element={<PetaPrioritas />} />
          <Route path="/rekomendasi" element={<Rekomendasi />} />
          <Route path="/laporan" element={<Laporan />} />
          <Route element={<AdminOnlyRoutes />}>
            <Route path="/simulasi" element={<Simulasi />} />
            <Route path="/kelola-akun" element={<AccountManagement />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
