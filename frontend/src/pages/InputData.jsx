import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Droplets,
  FileText,
  MapPin,
  Pencil,
  RotateCcw,
  Save,
  Sprout,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api";
import { useAuthUser } from "../auth-context";
import irrigationField from "../assets/irrigation-ricefield.png";

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

function getErrorMessage(requestError, fallback) {
  const detail = requestError.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

function todayLocal() {
  const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function createEmptyForm(villageId = "") {
  return {
    village_id: villageId,
    planting_season: "Musim berjalan",
    plant_age: "",
    water_availability: "",
    water_demand: "",
    water_demand_m3: "",
    canal_condition: "sedang",
    rainfall: "",
    recorded_at: todayLocal(),
  };
}

function getFormFromRecord(record) {
  return {
    village_id: String(record.village_id),
    planting_season: record.planting_season,
    plant_age: String(record.plant_age),
    water_availability: String(record.water_availability),
    water_demand: String(record.water_demand),
    water_demand_m3: record.water_demand_m3 == null ? "" : String(record.water_demand_m3),
    canal_condition: record.canal_condition,
    rainfall: record.rainfall == null ? "" : String(record.rainfall),
    recorded_at: record.recorded_at,
  };
}

function getLatestVillageRecord(records, villageId) {
  return records
    .filter((record) => String(record.village_id) === String(villageId))
    .sort((first, second) => second.recorded_at.localeCompare(first.recorded_at) || second.id - first.id)[0];
}

function formatDate(value, short = false) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", short
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function getValidationChecks(form, hasVillage) {
  const plantAge = Number(form.plant_age);
  const availability = Number(form.water_availability);
  const demand = Number(form.water_demand);
  const rainfall = Number(form.rainfall);
  const dateIsValid = Boolean(form.recorded_at) && !Number.isNaN(new Date(`${form.recorded_at}T00:00:00`).getTime());

  return [
    { label: "Desa dan musim tanam sudah dipilih", valid: hasVillage && Boolean(form.planting_season.trim()) && form.planting_season.length <= 50 },
    { label: "Tanggal pencatatan terisi", valid: dateIsValid },
    { label: "Umur tanaman dalam rentang 0–365 hari", valid: form.plant_age !== "" && plantAge >= 0 && plantAge <= 365 },
    { label: "Ketersediaan dan kebutuhan air dalam rentang 0–100%", valid: form.water_availability !== "" && form.water_demand !== "" && availability >= 0 && availability <= 100 && demand >= 0 && demand <= 100 },
    { label: "Kebutuhan air m³ opsional, tidak boleh negatif", valid: form.water_demand_m3 === "" || (Number.isFinite(Number(form.water_demand_m3)) && Number(form.water_demand_m3) >= 0) },
    { label: "Kondisi saluran dipilih", valid: ["baik", "sedang", "buruk"].includes(form.canal_condition) },
    { label: "Curah hujan opsional, tidak boleh negatif", valid: form.rainfall === "" || (Number.isFinite(rainfall) && rainfall >= 0) },
  ];
}

function StepProgress({ activeStep, role }) {
  const steps = [
    ["Pilih Desa", "Tentukan lokasi dan periode"],
    ["Isi Data", "Masukkan kondisi irigasi"],
    ["Simpan Data", "Catatan disimpan ke sistem"],
    role === "admin"
      ? ["Analisis AI", "Jalankan setelah data tersimpan"]
      : ["Validasi Admin", "Menunggu persetujuan"],
  ];

  return (
    <ol className="input-stepper" aria-label="Tahapan pencatatan data">
      {steps.map(([title, description], index) => {
        const step = index + 1;
        const complete = step < activeStep;
        const current = step === activeStep;
        return (
          <li className={`${complete ? "is-complete" : ""}${current ? " is-current" : ""}`} key={title}>
            <span className="input-step-number">{complete ? <Check size={17} /> : step}</span>
            <span className="input-step-copy"><strong>{title}</strong><small>{description}</small></span>
            {index < steps.length - 1 && <span className="input-step-connector" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function SectionTitle({ icon: Icon, title, tone }) {
  return (
    <div className={`input-section-title ${tone}`}>
      <span><Icon size={16} /></span>
      <strong>{title}</strong>
    </div>
  );
}

function InputData() {
  const user = useAuthUser();
  const [villages, setVillages] = useState([]);
  const [records, setRecords] = useState([]);
  const [profileDrafts, setProfileDrafts] = useState({});
  const [form, setForm] = useState(() => createEmptyForm());
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [trendRange, setTrendRange] = useState("6");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const askConfirmation = (details) => setConfirmation(details);

  useEffect(() => {
    if (!confirmation) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setConfirmation(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmation]);

  const selectableVillages = user.role === "admin"
    ? villages
    : villages.filter((village) => village.id === user.assigned_village_id);

  const loadPageData = useCallback(async (showLoading = true) => {
    try {
      const [villageResponse, recordResponse] = await Promise.all([
        api.get("/api/villages/"),
        api.get("/api/irrigation/"),
      ]);
      setVillages(villageResponse.data);
      setRecords(recordResponse.data);
      const defaultVillageId = user.role === "admin"
        ? villageResponse.data[0]?.id
        : user.assigned_village_id;
      setForm((current) => {
        if (current.village_id) return current;
        const villageId = String(defaultVillageId || "");
        const latestRecord = getLatestVillageRecord(recordResponse.data, villageId);
        return latestRecord ? getFormFromRecord(latestRecord) : createEmptyForm(villageId);
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Gagal memuat desa atau riwayat irigasi. Pastikan backend berjalan."));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user.role, user.assigned_village_id]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const selectedVillage = villages.find((village) => String(village.id) === form.village_id);
  const profileDraft = profileDrafts[form.village_id] || {
    area_hectare: selectedVillage?.area_hectare > 0 ? String(selectedVillage.area_hectare) : "",
    farmer_count: selectedVillage?.farmer_count > 0 ? String(selectedVillage.farmer_count) : "",
  };
  const selectedRecords = useMemo(() => records
    .filter((record) => String(record.village_id) === form.village_id)
    .sort((first, second) => second.recorded_at.localeCompare(first.recorded_at) || second.id - first.id),
  [records, form.village_id]);
  const recentRecords = selectedRecords.slice(0, 5);
  const validTrendRecords = selectedRecords
    .filter((record) => record.validation_status === "validated")
    .slice(0, trendRange === "all" ? selectedRecords.length : Number(trendRange))
    .reverse()
    .map((record) => ({
      date: record.recorded_at,
      label: formatDate(record.recorded_at, true),
      availability: record.water_availability,
    }));
  const checks = getValidationChecks(form, selectableVillages.some((village) => String(village.id) === form.village_id));
  const isFormValid = checks.every((check) => check.valid);
  const activeStep = saveComplete ? 4 : saving ? 3 : editingId || isFormValid ? 2 : 1;

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "village_id") {
      const latestRecord = getLatestVillageRecord(records, value);
      setForm(latestRecord ? getFormFromRecord(latestRecord) : createEmptyForm(value));
      setEditingId(null);
    } else {
      setForm((current) => ({ ...current, [name]: value }));
    }
    setSuccess("");
    setError("");
    setSaveComplete(false);
    if (name === "village_id") setProfileMessage(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(createEmptyForm(String(selectableVillages[0]?.id || "")));
    setError("");
    setSuccess("Form berhasil direset. Data yang belum disimpan telah dibersihkan.");
    setSaveComplete(false);
  };

  const handleReset = () => askConfirmation({
    title: "Reset formulir input?",
    message: "Semua isian yang belum disimpan akan dihapus dari formulir.",
    confirmLabel: "Reset formulir",
    onConfirm: resetForm,
  });

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    const villageKey = form.village_id;
    setProfileDrafts((current) => ({
      ...current,
      [villageKey]: {
        ...(current[villageKey] || {
          area_hectare: selectedVillage?.area_hectare > 0 ? String(selectedVillage.area_hectare) : "",
          farmer_count: selectedVillage?.farmer_count > 0 ? String(selectedVillage.farmer_count) : "",
        }),
        [name]: value,
      },
    }));
    setProfileMessage(null);
  };

  const saveVillageProfile = async () => {
    if (!selectedVillage) return;
    const areaHectare = Number(profileDraft.area_hectare);
    const farmerCount = Number(profileDraft.farmer_count);
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const response = await api.patch(`/api/villages/${selectedVillage.id}`, {
        area_hectare: areaHectare,
        farmer_count: farmerCount,
      });
      setVillages((current) => current.map((village) => village.id === response.data.id ? response.data : village));
      setProfileDrafts((current) => ({
        ...current,
        [form.village_id]: {
          area_hectare: String(response.data.area_hectare),
          farmer_count: String(response.data.farmer_count),
        },
      }));
      setProfileMessage({ type: "success", text: "Profil desa berhasil diperbarui." });
    } catch (requestError) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(requestError, "Profil desa gagal diperbarui."),
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileSave = () => {
    if (!selectedVillage) return;
    const areaHectare = Number(profileDraft.area_hectare);
    const farmerCount = Number(profileDraft.farmer_count);
    if (
      profileDraft.area_hectare === "" ||
      profileDraft.farmer_count === "" ||
      !Number.isFinite(areaHectare) ||
      areaHectare < 0 ||
      !Number.isInteger(farmerCount) ||
      farmerCount < 0
    ) {
      setProfileMessage({ type: "error", text: "Masukkan luas sawah ≥ 0 dan jumlah petani berupa bilangan bulat ≥ 0." });
      return;
    }
    askConfirmation({
      title: "Simpan profil desa?",
      message: `Luas sawah ${numberFormat.format(areaHectare)} ha dan jumlah petani ${numberFormat.format(farmerCount)} orang akan disimpan untuk Desa ${selectedVillage.name}.`,
      confirmLabel: "Simpan profil",
      onConfirm: saveVillageProfile,
    });
  };

  const saveIrrigationData = async () => {
    setSaving(true);
    setSaveComplete(false);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        village_id: Number(form.village_id),
        plant_age: Number(form.plant_age),
        water_availability: Number(form.water_availability),
        water_demand: Number(form.water_demand),
        water_demand_m3: form.water_demand_m3 === "" ? null : Number(form.water_demand_m3),
        rainfall: form.rainfall === "" ? null : Number(form.rainfall),
      };
      let response;
      if (editingId) {
        response = await api.put(`/api/irrigation/${editingId}`, payload);
      } else {
        response = await api.post("/api/irrigation/", payload);
      }
      await loadPageData(false);
      const savedRecord = response.data;
      setForm(getFormFromRecord(savedRecord));
      setSuccess(editingId ? "Catatan irigasi berhasil diperbarui." : "Catatan irigasi berhasil disimpan.");
      setEditingId(null);
      setSaveComplete(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Data belum berhasil disimpan. Periksa isian dan koneksi backend."));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    askConfirmation({
      title: editingId ? "Perbarui catatan irigasi?" : "Simpan catatan irigasi?",
      message: `Data untuk Desa ${selectedVillage?.name || "yang dipilih"} pada ${formatDate(form.recorded_at)} akan ${editingId ? "diperbarui" : "disimpan"}.`,
      confirmLabel: editingId ? "Perbarui data" : "Simpan data",
      onConfirm: saveIrrigationData,
    });
  };

  const loadRecordForEdit = (record) => {
    setEditingId(record.id);
    setError("");
    setSuccess("");
    setSaveComplete(false);
    setForm(getFormFromRecord(record));
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSuccess("Catatan dimuat ke formulir. Periksa kembali sebelum menyimpan perubahan.");
  };

  const handleEdit = (record) => askConfirmation({
    title: "Muat catatan untuk diedit?",
    message: `Catatan tanggal ${formatDate(record.recorded_at)} akan dimuat ke formulir dan menggantikan isian yang sedang tampil.`,
    confirmLabel: "Lanjut edit",
    onConfirm: () => loadRecordForEdit(record),
  });

  const deleteRecord = async (record) => {
    setDeletingId(record.id);
    setError("");
    setSuccess("");
    try {
      await api.delete(`/api/irrigation/${record.id}`);
      if (editingId === record.id) resetForm();
      await loadPageData(false);
      setSuccess("Riwayat pencatatan berhasil dihapus.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Riwayat gagal dihapus."));
    } finally {
      setDeletingId(null);
    }
  };

  const resetAllRecords = async () => {
    setResettingAll(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.delete("/api/irrigation/");
      const deletedCount = response.data.deleted_count ?? records.length;
      const villageId = String(form.village_id || selectableVillages[0]?.id || "");
      setRecords([]);
      setEditingId(null);
      setDeletingId(null);
      setForm(createEmptyForm(villageId));
      setSaveComplete(false);
      setSuccess(`${deletedCount} catatan irigasi dari seluruh desa berhasil dihapus. Profil desa dan akun tetap tersimpan.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Semua catatan gagal dihapus."));
    } finally {
      setResettingAll(false);
    }
  };

  const handleResetAllRecords = () => {
    if (!records.length || resettingAll) return;
    askConfirmation({
      title: "Reset semua catatan input desa?",
      message: `Sebanyak ${records.length} catatan irigasi dari seluruh desa akan dihapus permanen. Isian formulir yang belum disimpan juga akan dikosongkan. Riwayat analisis terkait akan dihapus dan perlu dijalankan ulang; profil desa dan akun tetap tersimpan.`,
      confirmLabel: "Hapus semua catatan",
      danger: true,
      onConfirm: resetAllRecords,
    });
  };

  const handleDelete = (record) => {
    const name = villages.find((village) => village.id === record.village_id)?.name || "Desa";
    askConfirmation({
      title: "Hapus catatan irigasi?",
      message: `Catatan Desa ${name} tanggal ${formatDate(record.recorded_at)} akan dihapus permanen dan tidak dapat dipulihkan.`,
      confirmLabel: "Hapus catatan",
      danger: true,
      onConfirm: () => deleteRecord(record),
    });
  };

  const updateValidation = async (record, validationStatus) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/api/irrigation/${record.id}/validation`, { validation_status: validationStatus });
      await loadPageData(false);
      setSuccess(validationStatus === "validated"
        ? "Catatan disetujui dan masuk ke data tervalidasi. Jalankan analisis untuk memperbarui hasil AI."
        : "Catatan ditolak dan tidak dimasukkan ke analisis AI.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Status validasi gagal diperbarui."));
    } finally {
      setSaving(false);
    }
  };

  const handleValidation = (record, validationStatus) => {
    const isApproval = validationStatus === "validated";
    const name = villages.find((village) => village.id === record.village_id)?.name || "Desa";
    askConfirmation({
      title: isApproval ? "Setujui catatan irigasi?" : "Tolak catatan irigasi?",
      message: isApproval
        ? `Catatan Desa ${name} tanggal ${formatDate(record.recorded_at)} akan masuk ke data tervalidasi dan dapat digunakan dalam analisis AI.`
        : `Catatan Desa ${name} tanggal ${formatDate(record.recorded_at)} tidak akan digunakan dalam analisis AI.`,
      confirmLabel: isApproval ? "Setujui catatan" : "Tolak catatan",
      danger: !isApproval,
      onConfirm: () => updateValidation(record, validationStatus),
    });
  };

  return (
    <div className="input-data-page">
      <header className="input-page-header">
        <div>
          <h1>Input Data</h1>
          <p>Masukkan dan perbarui catatan kondisi irigasi sebagai dasar analisis prioritas.</p>
        </div>
        <div className="input-header-date">
          <CalendarDays size={20} />
          <span><strong>Periode pencatatan</strong><small>{form.planting_season || "Pilih musim tanam"}</small></span>
        </div>
      </header>

      <StepProgress activeStep={activeStep} role={user.role} />

      {user.role !== "admin" && !user.assigned_village_id && (
        <div className="error-message form-message" role="alert">Akun Anda belum mendapat desa tugas. Minta Admin menetapkan desa melalui menu Kelola Akun.</div>
      )}
      {error && <p className="error-message form-message" role="alert">{error}</p>}
      {success && <p className="success-message form-message" role="status">{success}</p>}

      {loading ? <p className="input-loading">Memuat desa dan riwayat pencatatan...</p> : (
        <div className="input-data-layout">
          <div className="input-left-column">
            <section className="input-panel input-context-panel">
              <SectionTitle icon={MapPin} title="Pilih Desa dan Periode" tone="green" />
              <label className="input-field">
                <span>Nama Desa</span>
                <select name="village_id" value={form.village_id} onChange={handleChange} required disabled={!selectableVillages.length}>
                  {!selectableVillages.length && <option value="">Belum ada desa tugas</option>}
                  {selectableVillages.map((village) => <option value={village.id} key={village.id}>{village.name}</option>)}
                </select>
              </label>
              <label className="input-field">
                <span>Musim Tanam / Periode</span>
                <input name="planting_season" value={form.planting_season} onChange={handleChange} maxLength="50" placeholder="Contoh: MH 2026" required />
              </label>
              <label className="input-field">
                <span>Tanggal Input</span>
                <input type="date" name="recorded_at" value={form.recorded_at} onChange={handleChange} required />
              </label>
            </section>

            <section className="input-panel input-village-info">
              <SectionTitle icon={Sprout} title="Informasi Desa" tone="green" />
              <div
                className="input-village-cover"
                role="img"
                aria-label="Ilustrasi sawah dan saluran irigasi, bukan foto spesifik desa"
                style={{ backgroundImage: `linear-gradient(0deg, rgba(12, 38, 29, 0.35), transparent 55%), url(${irrigationField})` }}
              >
                <span>Ilustrasi area pertanian</span>
              </div>
              <div className="input-village-profile-fields">
                <label className="input-field">
                  <span>Luas Sawah (ha)</span>
                  <input type="number" name="area_hectare" min="0" step="any" value={profileDraft.area_hectare} onChange={handleProfileChange} placeholder="Masukkan luas sawah" disabled={profileSaving || !selectedVillage} />
                </label>
                <label className="input-field">
                  <span>Jumlah Petani (orang)</span>
                  <input type="number" name="farmer_count" min="0" step="1" value={profileDraft.farmer_count} onChange={handleProfileChange} placeholder="Masukkan jumlah petani" disabled={profileSaving || !selectedVillage} />
                </label>
                <button className="input-profile-save" type="button" onClick={handleProfileSave} disabled={!selectedVillage || profileSaving}>
                  <Save size={14} /> {profileSaving ? "Menyimpan..." : "Simpan Profil Desa"}
                </button>
                {profileMessage && <p className={`input-profile-message ${profileMessage.type}`} role={profileMessage.type === "error" ? "alert" : "status"}>{profileMessage.text}</p>}
                <p className="input-profile-note">Data ini disimpan pada profil desa, terpisah dari catatan irigasi.</p>
                <div className="input-profile-record-count"><span>Catatan irigasi tersimpan</span><strong>{selectedRecords.length}</strong></div>
              </div>
            </section>
          </div>

          <form className="input-panel input-form-panel" onSubmit={handleSubmit}>
            <div className="input-form-heading">
              <SectionTitle icon={ClipboardList} title={editingId ? "Perbarui Data Irigasi" : "Form Input Data"} tone="green" />
              <span className="input-form-method">Fuzzy Logic</span>
            </div>

            <SectionTitle icon={Sprout} title="1. Data Umum Pertanian" tone="green" />
            <div className="input-fields-grid">
              <label className="input-field">
                <span>Umur Tanaman (hari)</span>
                <div className="input-with-unit"><input type="number" name="plant_age" min="0" max="365" value={form.plant_age} onChange={handleChange} placeholder="Contoh: 45" required /><span>hari</span></div>
              </label>
              <label className="input-field">
                <span>Kebutuhan Air Tanaman</span>
                <div className="input-with-unit"><input type="number" name="water_demand" min="0" max="100" step="0.1" value={form.water_demand} onChange={handleChange} placeholder="0–100" required /><span>%</span></div>
              </label>
              <label className="input-field">
                <span>Kebutuhan Air Desa <small>(m³/musim, opsional)</small></span>
                <div className="input-with-unit"><input type="number" name="water_demand_m3" min="0" step="0.1" value={form.water_demand_m3} onChange={handleChange} placeholder="Contoh: 2300" /><span>m³</span></div>
              </label>
            </div>

            <SectionTitle icon={Droplets} title="2. Kondisi Ketersediaan Air" tone="blue" />
            <div className="input-fields-grid">
              <label className="input-field">
                <span>Ketersediaan Air di Saluran</span>
                <div className="input-with-unit"><input type="number" name="water_availability" min="0" max="100" step="0.1" value={form.water_availability} onChange={handleChange} placeholder="0–100" required /><span>%</span></div>
              </label>
              <label className="input-field">
                <span>Curah Hujan <small>(opsional)</small></span>
                <div className="input-with-unit"><input type="number" name="rainfall" min="0" step="0.1" value={form.rainfall} onChange={handleChange} placeholder="Tidak wajib" /><span>mm</span></div>
              </label>
            </div>

            <SectionTitle icon={Activity} title="3. Kondisi Saluran Irigasi" tone="amber" />
            <label className="input-field">
              <span>Kondisi Saluran</span>
              <select name="canal_condition" value={form.canal_condition} onChange={handleChange}>
                <option value="baik">Baik</option>
                <option value="sedang">Sedang</option>
                <option value="buruk">Buruk</option>
              </select>
            </label>

            <div className="input-method-note">
              <AlertCircle size={16} />
              <span>Skor Fuzzy memakai nilai persentase. Kebutuhan m³ digunakan untuk simulasi alokasi; jika kosong, menu Rekomendasi memakai nilai demo.</span>
            </div>

            <div className="input-form-actions">
              <button className="input-reset-button" type="button" onClick={() => handleReset()} disabled={saving}>
                <RotateCcw size={16} /> Reset Form
              </button>
              <button className="input-save-button" type="submit" disabled={saving || !selectableVillages.length || !isFormValid}>
                <Save size={16} /> {saving ? (editingId ? "Memperbarui..." : "Menyimpan...") : (editingId ? "Perbarui Data" : "Simpan Data")}
              </button>
            </div>
          </form>

          <aside className="input-right-column">
            <section className="input-panel input-history-preview">
              <div className="input-panel-heading">
                <SectionTitle icon={Clock3} title="Riwayat Input Data" tone="purple" />
                <a href="#riwayat-lengkap">Lihat Semua</a>
              </div>
              {!recentRecords.length ? (
                <p className="input-empty-state">Belum ada catatan untuk desa ini.</p>
              ) : (
                <div className="input-history-scroll">
                  <table className="input-history-table">
                    <thead><tr><th>Tanggal</th><th>Musim</th><th>Air</th><th>Kebutuhan m³</th><th>Aksi</th></tr></thead>
                    <tbody>
                      {recentRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDate(record.recorded_at)}</td>
                          <td>{record.planting_season}</td>
                          <td>{numberFormat.format(record.water_availability)}%</td>
                          <td>{record.water_demand_m3 == null ? "—" : numberFormat.format(record.water_demand_m3)}</td>
                          <td>
                            <div className="input-icon-actions">
                              <button type="button" title="Edit catatan" aria-label="Edit catatan" onClick={() => handleEdit(record)} disabled={saving || deletingId !== null}><Pencil size={15} /></button>
                              {user.role === "admin" && <button className="is-danger" type="button" title="Hapus catatan" aria-label="Hapus catatan" onClick={() => handleDelete(record)} disabled={saving || deletingId !== null}><Trash2 size={15} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="input-panel input-trend-panel">
              <div className="input-panel-heading">
                <SectionTitle icon={Activity} title="Tren Ketersediaan Air" tone="blue" />
                <select aria-label="Rentang tren" value={trendRange} onChange={(event) => setTrendRange(event.target.value)}>
                  <option value="6">6 Catatan</option>
                  <option value="12">12 Catatan</option>
                  <option value="all">Semua</option>
                </select>
              </div>
              {validTrendRecords.length ? (
                <div className="input-trend-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={validTrendRecords} margin={{ top: 14, right: 9, left: -22, bottom: 2 }}>
                      <defs><linearGradient id="water-trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2788e5" stopOpacity={0.28} /><stop offset="95%" stopColor="#2788e5" stopOpacity={0.03} /></linearGradient></defs>
                      <CartesianGrid stroke="#e9eef0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#667085" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#667085" }} />
                      <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""} formatter={(value) => [`${numberFormat.format(Number(value))}%`, "Ketersediaan air"]} />
                      <Area type="monotone" dataKey="availability" stroke="#2788e5" strokeWidth={2.5} fill="url(#water-trend-fill)" activeDot={{ r: 5 }} dot={{ r: 3, fill: "#2788e5" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="input-empty-state">Grafik muncul setelah ada catatan tervalidasi.</p>}
            </section>

            <section className="input-panel input-validation-panel">
              <div className="input-validation-heading">
                <SectionTitle icon={CheckCircle2} title="Validasi Data" tone={isFormValid ? "green" : "red"} />
                <span className={isFormValid ? "is-valid" : "is-invalid"}>{isFormValid ? "Data Valid" : "Periksa Form"}</span>
              </div>
              <ul className="input-validation-list">
                {checks.map((check) => (
                  <li className={check.valid ? "is-valid" : "is-invalid"} key={check.label}>
                    {check.valid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span>{check.label}</span>
                  </li>
                ))}
              </ul>
              <p className="input-validation-note">
                {user.role === "admin"
                  ? "Catatan Admin langsung tervalidasi. Jalankan analisis AI setelah data disimpan."
                  : "Catatan Petugas akan menunggu validasi Admin sebelum digunakan oleh analisis AI."}
              </p>
            </section>
          </aside>
        </div>
      )}

      <section className="data-table-card input-full-history" id="riwayat-lengkap">
        <div className="input-full-history-heading">
          <div><h2>Riwayat Pencatatan</h2><p>Kelola, validasi, dan tinjau catatan irigasi desa.</p></div>
          <div className="input-history-actions">
            <span>{records.length} catatan</span>
            {user.role === "admin" && (
              <button
                className="input-clear-all-button"
                type="button"
                onClick={handleResetAllRecords}
                disabled={!records.length || resettingAll || loading}
              >
                <Trash2 size={14} />
                {resettingAll ? "Menghapus..." : "Reset semua data"}
              </button>
            )}
          </div>
        </div>
        {!records.length ? (
          <p className="empty-message">Belum ada catatan irigasi.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table input-complete-history-table">
              <thead>
                <tr><th>Tanggal</th><th>Desa</th><th>Musim Tanam</th><th>Umur</th><th>Ketersediaan</th><th>Kebutuhan</th><th>Kebutuhan m³</th><th>Saluran</th><th>Pencatat</th><th>Validasi</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.recorded_at)}</td>
                    <td>{villages.find((village) => village.id === record.village_id)?.name || "Desa"}</td>
                    <td>{record.planting_season}</td>
                    <td>{record.plant_age} hari</td>
                    <td>{numberFormat.format(record.water_availability)}%</td>
                    <td>{numberFormat.format(record.water_demand)}%</td>
                    <td>{record.water_demand_m3 == null ? "—" : numberFormat.format(record.water_demand_m3)}</td>
                    <td>{record.canal_condition}</td>
                    <td>{record.created_by_username || "Data lama"}</td>
                    <td><span className={`status-badge validation-${record.validation_status}`}>{record.validation_status === "validated" ? "Tervalidasi" : record.validation_status === "pending" ? "Menunggu" : "Ditolak"}</span></td>
                    <td>
                      <div className="history-actions">
                        <button className="history-edit-button" type="button" onClick={() => handleEdit(record)} disabled={saving || deletingId !== null}><Pencil size={13} /> Edit</button>
                        {user.role === "admin" && record.validation_status === "pending" && <>
                          <button className="history-edit-button" type="button" onClick={() => handleValidation(record, "validated")} disabled={saving || deletingId !== null}>Setujui</button>
                          <button className="history-delete-button" type="button" onClick={() => handleValidation(record, "rejected")} disabled={saving || deletingId !== null}>Tolak</button>
                        </>}
                        {user.role === "admin" && <button className="history-delete-button" type="button" onClick={() => handleDelete(record)} disabled={saving || deletingId !== null}><Trash2 size={13} /> {deletingId === record.id ? "Menghapus..." : "Hapus"}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="input-disclaimer"><FileText size={14} /> Persentase dipakai sebagai skala input Fuzzy. Kebutuhan m³ adalah nilai terpisah untuk simulasi alokasi dan opsional jika belum ada pengukuran.</p>

      {confirmation && (
        <div className="action-confirm-overlay">
          <section
            className="action-confirm-dialog"
            role={confirmation.danger ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby="input-confirm-title"
            aria-describedby="input-confirm-message"
          >
            <span className={`action-confirm-icon${confirmation.danger ? " is-danger" : ""}`}><AlertCircle size={22} /></span>
            <h2 id="input-confirm-title">{confirmation.title}</h2>
            <p id="input-confirm-message">{confirmation.message}</p>
            <div className="action-confirm-buttons">
              <button className="action-confirm-cancel" type="button" onClick={() => setConfirmation(null)}>Batal</button>
              <button
                className={`action-confirm-accept${confirmation.danger ? " is-danger" : ""}`}
                type="button"
                onClick={() => {
                  const onConfirm = confirmation.onConfirm;
                  setConfirmation(null);
                  if (onConfirm) void onConfirm();
                }}
              >
                {confirmation.confirmLabel || "Ya, lanjutkan"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default InputData;
