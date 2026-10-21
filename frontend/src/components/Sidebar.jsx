import {
  LayoutDashboard,
  Database,
  ClipboardPen,
  Brain,
  Map,
  Lightbulb,
  FlaskConical,
  FileText,
  Settings,
  LogOut,
  UsersRound,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import BrandMark from "./BrandMark";

const menus = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: "Data Desa",
    icon: Database,
    path: "/data-desa",
  },
  {
    label: "Input Data",
    icon: ClipboardPen,
    path: "/input-data",
  },
  {
    label: "Analisis AI",
    icon: Brain,
    path: "/analisis-ai",
  },
  {
    label: "Peta Prioritas",
    icon: Map,
    path: "/peta-prioritas",
  },
  {
    label: "Rekomendasi",
    icon: Lightbulb,
    path: "/rekomendasi",
  },
  {
    label: "Simulasi Skenario",
    icon: FlaskConical,
    path: "/simulasi",
    adminOnly: true,
  },
  {
    label: "Laporan",
    icon: FileText,
    path: "/laporan",
  },
  {
    label: "Kelola Akun",
    icon: UsersRound,
    path: "/kelola-akun",
    adminOnly: true,
  },
];

function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandMark className="sidebar-brand-mark" />
        <div className="brand-icon">💧</div>

        <div>
          <div className="brand-title">KARANGAMPEL</div>
          <div className="brand-subtitle">IRRIGATION AI</div>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menus.filter((menu) => !menu.adminOnly || user.role === "admin").map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{menu.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-item">
          <Settings size={20} />
          <span>Pengaturan</span>
        </button>

        <button className="sidebar-item" onClick={onLogout} type="button">
          <LogOut size={20} />
          <span>Keluar</span>
        </button>

        <div className="admin-profile">
          <div className="admin-avatar">
            {user.full_name.slice(0, 1).toUpperCase()}
          </div>

          <div>
            <strong>{user.full_name}</strong>
            <small>{user.role === "admin" ? "Admin" : "Petugas Lapangan"}</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
