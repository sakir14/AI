import { useEffect, useState } from "react";
import api from "../api";
import { useAuthUser } from "../auth-context";

function AccountManagement() {
  const currentUser = useAuthUser();
  const [users, setUsers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "petugas",
    assigned_village_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [userResponse, villageResponse] = await Promise.all([
        api.get("/api/users/"),
        api.get("/api/villages/"),
      ]);
      setUsers(userResponse.data);
      setVillages(villageResponse.data);
      setForm((current) => ({
        ...current,
        assigned_village_id:
          current.assigned_village_id || String(villageResponse.data[0]?.id || ""),
      }));
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Gagal memuat daftar akun.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = {
      full_name: form.full_name,
      username: form.username,
      password: form.password,
      role: form.role,
      assigned_village_id:
        form.role === "petugas" ? Number(form.assigned_village_id) : null,
    };
    try {
      await api.post("/api/users/", payload);
      setForm((current) => ({
        ...current,
        full_name: "",
        username: "",
        password: "",
      }));
      setSuccess(`Akun ${form.role === "admin" ? "Admin" : "Petugas"} berhasil dibuat.`);
      await loadData();
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Akun gagal dibuat. Periksa data dan koneksi server.");
    } finally {
      setSaving(false);
    }
  };

  const changeAssignment = async (user, assignedVillageId) => {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/api/users/${user.id}`, {
        assigned_village_id: Number(assignedVillageId),
      });
      setSuccess(`Penugasan ${user.full_name} berhasil diperbarui.`);
      await loadData();
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Penugasan gagal diperbarui.");
    }
  };

  const toggleAccount = async (user) => {
    setError("");
    setSuccess("");
    try {
      await api.patch(`/api/users/${user.id}`, { is_active: !user.is_active });
      setSuccess(`Akun ${user.username} berhasil ${user.is_active ? "dinonaktifkan" : "diaktifkan"}.`);
      await loadData();
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Status akun gagal diperbarui.");
    }
  };

  return (
    <div>
      <h1 className="page-title">Kelola Akun Pengguna</h1>
      <p className="page-subtitle">
        Buat akun Admin atau Petugas, tetapkan desa tugas, dan atur status akun.
      </p>
      <div className="info-banner">
        Pendaftaran umum hanya membuat akun Petugas. Hak Admin diberikan dari halaman ini dan hanya dapat dikelola oleh Admin aktif.
      </div>

      {error && <p className="error-message form-message">{error}</p>}
      {success && <p className="success-message form-message">{success}</p>}

      <form className="form-card account-form" onSubmit={handleSubmit}>
        <h2 className="form-card-title">Buat akun baru</h2>
        <label>
          Nama lengkap
          <input
            name="full_name"
            maxLength="100"
            minLength="2"
            onChange={handleChange}
            required
            value={form.full_name}
          />
        </label>
        <label>
          Username
          <input
            name="username"
            maxLength="32"
            minLength="3"
            onChange={handleChange}
            pattern="[A-Za-z0-9_.-]{3,32}"
            required
            value={form.username}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            maxLength="128"
            minLength="8"
            onChange={handleChange}
            required
            value={form.password}
          />
        </label>
        <label>
          Peran akun
          <select name="role" onChange={handleChange} value={form.role}>
            <option value="petugas">Petugas Lapangan</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {form.role === "petugas" && (
          <label>
            Desa penugasan
            <select
              name="assigned_village_id"
              onChange={handleChange}
              required
              value={form.assigned_village_id}
            >
              {villages.map((village) => (
                <option key={village.id} value={village.id}>{village.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="form-actions">
          <button className="primary-button" disabled={saving || loading || !villages.length} type="submit">
            {saving ? "Membuat akun..." : "Buat akun"}
          </button>
        </div>
      </form>

      <section className="data-table-card history-card">
        <h2>Daftar akun</h2>
        {loading ? (
          <p>Memuat akun...</p>
        ) : users.length === 0 ? (
          <p className="empty-message">Belum ada akun pengguna.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Username</th>
                  <th>Peran</th>
                  <th>Desa tugas</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.username}</td>
                    <td>{user.role === "admin" ? "Admin" : "Petugas Lapangan"}</td>
                    <td>
                      {user.role === "admin" ? (
                        "Semua desa"
                      ) : (
                        <select
                          aria-label={`Desa tugas untuk ${user.username}`}
                          className="account-assignment-select"
                          onChange={(event) => changeAssignment(user, event.target.value)}
                          value={user.assigned_village_id || ""}
                        >
                          <option value="" disabled>Belum ditugaskan</option>
                          {villages.map((village) => (
                            <option key={village.id} value={village.id}>{village.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>{user.is_active ? "Aktif" : "Nonaktif"}</td>
                    <td>
                      <button
                        className={user.is_active ? "history-delete-button" : "history-edit-button"}
                        disabled={
                          user.id === currentUser.id ||
                          (user.role === "admin" && user.is_active && users.filter((item) => item.role === "admin" && item.is_active).length === 1)
                        }
                        onClick={() => toggleAccount(user)}
                        type="button"
                      >
                        {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AccountManagement;
