import { useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";
import { saveAuth } from "../auth";
import BrandMark from "../components/BrandMark";
import irrigationField from "../assets/irrigation-ricefield.png";

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [villages, setVillages] = useState([]);
  const [villageId, setVillageId] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get("/api/auth/villages")
      .then(({ data }) => {
        setVillages(data);
        setVillageId(String(data[0]?.id || ""));
      })
      .catch(() => setMessage("Daftar desa belum tersedia. Coba muat ulang halaman."));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Konfirmasi password belum sama.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const { data } = await api.post("/api/auth/register", {
        full_name: fullName,
        username,
        password,
        village_id: Number(villageId),
      });
      saveAuth(data);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessage(
        typeof detail === "string"
          ? detail
          : "Akun belum dapat dibuat. Periksa koneksi server dan data Anda.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="auth-page"
      style={{ "--irrigation-background": `url(${irrigationField})` }}
    >
      <header className="auth-page-header">
        <Link className="auth-brand" to="/">
          <BrandMark className="auth-brand-mark" />
          <span>
            <strong>KARANGAMPEL</strong>
            <small>IRRIGATION AI</small>
          </span>
        </Link>
        <Link className="auth-back-link" to="/">
          <ArrowLeft size={17} />
          Kembali masuk
        </Link>
      </header>

      <section className="register-card" aria-labelledby="register-title">
        <div className="register-card-heading">
          <div className="register-role-icon">
            <UserRound size={23} />
          </div>
          <p className="register-kicker">Pendaftaran Pengguna</p>
          <h1 id="register-title">Buat Akun Petugas</h1>
          <p>Daftarkan akun untuk membantu pencatatan kondisi irigasi.</p>
        </div>

        <div className="register-role-note">
          <strong>Peran akun: Petugas Lapangan</strong>
          <span>Akun Admin dibuat oleh Admin melalui menu Kelola Akun.</span>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <label htmlFor="register-full-name">Nama lengkap</label>
          <input
            autoComplete="name"
            id="register-full-name"
            maxLength={100}
            minLength={2}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Masukkan nama lengkap"
            required
            value={fullName}
          />

          <label htmlFor="register-village">Desa penugasan</label>
          <select
            id="register-village"
            onChange={(event) => setVillageId(event.target.value)}
            required
            value={villageId}
          >
            <option value="" disabled>Pilih desa penugasan</option>
            {villages.map((village) => (
              <option key={village.id} value={village.id}>{village.name}</option>
            ))}
          </select>

          <label htmlFor="register-username">Username</label>
          <input
            autoComplete="username"
            id="register-username"
            maxLength={32}
            minLength={3}
            onChange={(event) => setUsername(event.target.value)}
            pattern="[A-Za-z0-9_.-]{3,32}"
            placeholder="Contoh: petugas.karangampel"
            required
            value={username}
          />
          <small className="register-field-hint">
            3–32 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.
          </small>

          <label htmlFor="register-password">Password</label>
          <div className="register-password-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              autoComplete="new-password"
              id="register-password"
              maxLength={128}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 8 karakter"
              required
              type="password"
              value={password}
            />
          </div>

          <label htmlFor="register-confirm-password">Konfirmasi password</label>
          <div className="register-password-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              autoComplete="new-password"
              id="register-confirm-password"
              maxLength={128}
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Ulangi password"
              required
              type="password"
              value={confirmPassword}
            />
          </div>

          {message && <p className="register-message" role="alert">{message}</p>}

          <button className="login-submit register-submit" disabled={isSubmitting || !villages.length} type="submit">
            {isSubmitting ? "Membuat akun…" : "Buat Akun"}
          </button>
        </form>

        <p className="register-login-prompt">
          Sudah punya akun? <Link to="/">Masuk di sini</Link>
        </p>
      </section>
      <p className="auth-page-caption">Sistem Pendukung Keputusan Distribusi Air Irigasi · Karangampel</p>
    </main>
  );
}

export default RegisterPage;
