import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Eye,
  EyeOff,
  ListChecks,
  LogIn,
  LockKeyhole,
  MapPin,
  Moon,
  Sprout,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";

import BrandMark from "../components/BrandMark";
import irrigationField from "../assets/irrigation-ricefield.png";
import api from "../api";
import { saveAuth } from "../auth";

const features = [
  {
    icon: Sprout,
    title: "Analisis Prioritas",
    description: "Menentukan desa yang paling membutuhkan air.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Berbasis Data",
    description: "Menggunakan data pertanian di Kecamatan Karangampel.",
    id: "data",
  },
  {
    icon: MapPin,
    title: "Visualisasi Peta",
    description: "Melihat sebaran prioritas dalam bentuk peta interaktif.",
  },
  {
    icon: ListChecks,
    title: "Rekomendasi",
    description: "Mendukung distribusi air yang lebih terarah.",
  },
];

const navigation = [
  ["Beranda", "#beranda"],
  ["Tentang", "#tentang"],
  ["Fitur", "#fitur"],
  ["Data", "#data"],
  ["Kontak", "#kontak"],
];

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: "", text: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormMessage({ type: "", text: "" });

    try {
      const { data } = await api.post("/api/auth/login", { username, password });
      saveAuth(data, rememberMe);
      navigate(location.state?.from ?? "/dashboard", { replace: true });
    } catch (error) {
      const detail = error.response?.data?.detail;
      setFormMessage({
        type: "error",
        text: typeof detail === "string" ? detail : "Tidak dapat masuk. Periksa koneksi server dan akun Anda.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectRole(role) {
    setSelectedRole(role);
    setUsername(role === "Admin" ? "admin" : "petugas");
    setFormMessage({
      type: "info",
      text: `Username akun ${role} demo terisi. Masukkan password untuk melanjutkan.`,
    });
  }

  return (
    <div className={`login-page${isDark ? " is-dark" : ""}`}>
      <header className="login-header">
        <a className="login-brand" href="#beranda" aria-label="Karangampel Irrigation AI, beranda">
          <BrandMark className="login-brand-mark" />
          <span className="login-brand-copy">
            <strong>KARANGAMPEL</strong>
            <span>IRRIGATION AI</span>
          </span>
        </a>

        <nav className="login-nav" aria-label="Navigasi utama">
          {navigation.map(([label, href], index) => (
            <a
              className={index === 0 ? "is-current" : ""}
              href={href}
              key={label}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="login-header-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setIsDark((current) => !current)}
            aria-label={isDark ? "Gunakan tema terang" : "Gunakan tema gelap"}
            title={isDark ? "Tema terang" : "Tema gelap"}
          >
            {isDark ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <a className="guide-button" href="#fitur">
            <BookOpen size={19} strokeWidth={2.2} />
            <span>Panduan Penggunaan</span>
          </a>
        </div>
      </header>

      <main
        className="login-hero"
        id="beranda"
        style={{ "--irrigation-background": `url(${irrigationField})` }}
      >
        <section className="login-intro" aria-labelledby="welcome-title">
          <div className="intro-content">
            <div className="intro-badge">
              <Sprout size={17} />
              <span>Sistem Pendukung Keputusan Berbasis AI</span>
            </div>
            <div id="tentang">
              <h1 id="welcome-title">
                KARANGAMPEL
                <span>IRRIGATION AI</span>
              </h1>
              <p className="intro-description">
                Sistem cerdas untuk menentukan prioritas distribusi air irigasi
                pertanian di Kecamatan Karangampel menggunakan metode Fuzzy
                Logic.
              </p>
            </div>

            <div className="feature-grid" id="fitur">
              {features.map(({ icon: Icon, title, description, id }) => (
                <article className="feature-item" id={id} key={title}>
                  <div className="feature-icon">
                    <Icon size={29} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="login-panel-wrap" aria-label="Form masuk">
          <div className="login-panel">
            <div className="panel-brand" aria-hidden="true">
              <BrandMark className="panel-brand-mark" />
              <strong>KARANGAMPEL</strong>
              <span>IRRIGATION AI</span>
            </div>

            <div className="panel-heading">
              <h2 id="login-title">Masuk ke Sistem</h2>
              <p>Gunakan akun Anda untuk mengakses Karangampel Irrigation AI.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="username">Username</label>
              <div className="login-input-wrap">
                <UserRound size={20} aria-hidden="true" />
                <input
                  autoComplete="username"
                  id="username"
                  name="username"
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Masukkan username"
                  required
                  value={username}
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <LockKeyhole size={20} aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  id="password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  required
                  value={password}
                  type={showPassword ? "text" : "password"}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="login-options">
                <label className="remember-option" htmlFor="remember-me">
                  <input
                    checked={rememberMe}
                    id="remember-me"
                    onChange={(event) => setRememberMe(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Ingat saya</span>
                </label>
                <button
                  className="forgot-link"
                  onClick={() => setFormMessage({ type: "info", text: "Fitur lupa password belum tersedia." })}
                  type="button"
                >
                  Lupa password?
                </button>
              </div>

              {formMessage.text && (
                <p className={`login-form-message ${formMessage.type}`} role="status">
                  {formMessage.text}
                </p>
              )}

              <button className="login-submit" disabled={isSubmitting} type="submit">
                <LogIn size={20} strokeWidth={2.4} />
                <span>{isSubmitting ? "Memeriksa akun…" : "Masuk"}</span>
              </button>
            </form>

            <div className="role-divider">
              <span>akun demo tersedia</span>
            </div>

            <p className="login-demo-note">
              Pilih peran untuk mengisi username. Password tetap diperlukan.
            </p>

            <div className="role-options" aria-label="Pilih peran akses demo">
              <button
                aria-pressed={selectedRole === "Admin"}
                className={`role-option admin-role${selectedRole === "Admin" ? " selected" : ""}`}
                onClick={() => selectRole("Admin")}
                type="button"
              >
                <UsersRound size={25} fill="currentColor" strokeWidth={1.6} />
                <span>
                  <strong>Admin</strong>
                  <small>Admin demo</small>
                </span>
              </button>
              <button
                aria-pressed={selectedRole === "Petugas"}
                className={`role-option field-role${selectedRole === "Petugas" ? " selected" : ""}`}
                onClick={() => selectRole("Petugas")}
                type="button"
              >
                <UserRound size={25} fill="currentColor" strokeWidth={1.6} />
                <span>
                  <strong>Petugas</strong>
                  <small>Petugas demo</small>
                </span>
              </button>
            </div>
            <p className="register-prompt">
              Belum punya akun? <Link to="/register">Buat akun Petugas</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="login-footer" id="kontak">
        <div className="footer-project">
          <strong>Karangampel Irrigation AI</strong>
          <span className="footer-separator" aria-hidden="true">|</span>
          <span>Sistem Pendukung Keputusan Distribusi Air Irigasi</span>
        </div>
        <div className="footer-meta">
          <span>
            <MapPin size={18} fill="currentColor" />
            Kecamatan Karangampel, Kabupaten Indramayu
          </span>
          <span>
            <CalendarDays size={18} />
            Tahun {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
