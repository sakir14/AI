import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpDown,
  CalendarDays,
  ChevronRight,
  Droplets,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sprout,
  UsersRound,
} from "lucide-react";
import api from "../api";
import irrigationField from "../assets/irrigation-ricefield.png";

const categoryInfo = {
  sangat_tinggi: { label: "Sangat tinggi", color: "#e9434e" },
  tinggi: { label: "Tinggi", color: "#f5823b" },
  sedang: { label: "Sedang", color: "#e8b833" },
  rendah: { label: "Rendah", color: "#36a66a" },
};

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat("id-ID");

function formatDate(value) {
  if (!value) return "Belum ada catatan";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Belum ada catatan";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function displayValue(value, suffix = "") {
  return value === null || value === undefined || value === ""
    ? "Belum tersedia"
    : `${value}${suffix}`;
}

function validationLabel(status) {
  if (status === "pending") return "Menunggu validasi";
  if (status === "rejected") return "Ditolak";
  return "Tervalidasi";
}

function SummaryCard({ icon: Icon, label, value, note, tone }) {
  return (
    <article className="village-summary-card">
      <span className={`village-summary-icon ${tone}`}><Icon size={25} /></span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{note}</small>
      </div>
    </article>
  );
}

function DataDesa() {
  const [villages, setVillages] = useState([]);
  const [records, setRecords] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [selectedVillageId, setSelectedVillageId] = useState(null);
  const [selectedTab, setSelectedTab] = useState("umum");
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [canalFilter, setCanalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [villageResponse, recordResponse, analysisResponse] = await Promise.all([
          api.get("/api/villages/"),
          api.get("/api/irrigation/"),
          api.get("/api/analysis/"),
        ]);
        setVillages(villageResponse.data);
        setRecords(recordResponse.data);
        setAnalysis(analysisResponse.data);
        setSelectedVillageId(villageResponse.data[0]?.id ?? null);
      } catch (requestError) {
        const detail = requestError.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Gagal mengambil data desa.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const seasons = useMemo(
    () => [...new Set(records.map((record) => record.planting_season).filter(Boolean))].sort(),
    [records],
  );
  const seasonRecords = useMemo(
    () => season === "all"
      ? records
      : records.filter((record) => record.planting_season === season),
    [records, season],
  );
  const latestRecordsByVillage = useMemo(() => {
    const sorted = [...seasonRecords].sort((first, second) => {
      const dateOrder = second.recorded_at.localeCompare(first.recorded_at);
      return dateOrder || second.id - first.id;
    });
    return new Map(sorted.map((record) => [record.village_id, record]).reverse());
  }, [seasonRecords]);
  const rows = useMemo(() => {
    const analysisByVillage = new Map((analysis?.results || []).map((result) => [result.village_id, result]));
    return villages.map((village) => {
      const record = latestRecordsByVillage.get(village.id) || null;
      const candidateAnalysis = analysisByVillage.get(village.id);
      const currentAnalysis = record?.validation_status === "validated" &&
        candidateAnalysis?.recorded_at === record.recorded_at &&
        candidateAnalysis?.inputs?.planting_season === record.planting_season
        ? candidateAnalysis
        : null;
      return { ...village, record, analysis: currentAnalysis };
    });
  }, [analysis, villages, latestRecordsByVillage]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("id-ID");
    const filtered = rows.filter((row) => {
      const matchesName = row.name.toLocaleLowerCase("id-ID").includes(normalizedSearch);
      const matchesPriority = priorityFilter === "all" || row.analysis?.category === priorityFilter;
      const matchesCanal = canalFilter === "all" || row.record?.canal_condition === canalFilter;
      return matchesName && matchesPriority && matchesCanal;
    });
    return filtered.sort((first, second) => {
      if (sortBy === "area") return second.area_hectare - first.area_hectare;
      if (sortBy === "score") return (second.analysis?.score || 0) - (first.analysis?.score || 0);
      return first.name.localeCompare(second.name, "id-ID");
    });
  }, [rows, search, priorityFilter, canalFilter, sortBy]);

  const selectedVillage = rows.find((village) => village.id === selectedVillageId) || null;
  const validatedRows = rows.filter((village) => village.record?.validation_status === "validated");
  const average = (key) => {
    const values = validatedRows
      .map((village) => Number(village.record?.[key]))
      .filter(Number.isFinite);
    return values.length ? numberFormat.format(values.reduce((sum, value) => sum + value, 0) / values.length) : "—";
  };
  const totalArea = villages.reduce((sum, village) => sum + (village.area_hectare || 0), 0);
  const totalFarmers = villages.reduce((sum, village) => sum + (village.farmer_count || 0), 0);
  const latestRecordDate = records
    .map((record) => record.recorded_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  const visibleRange = filteredRows.length ? `Menampilkan ${filteredRows.length} dari ${villages.length} desa` : "Tidak ada desa yang cocok";

  return (
    <div className="village-page">
      <header className="village-page-header">
        <div>
          <h1>Data Desa</h1>
          <p>Daftar dan kelola data pertanian serta kondisi irigasi desa di Kecamatan Karangampel.</p>
        </div>
        <div className="village-header-meta">
          <div className="village-latest-date">
            <CalendarDays size={20} />
            <span><strong>Data terakhir</strong><small>{formatDate(latestRecordDate)}</small></span>
          </div>
          <label className="village-season-select">
            <span>Musim tanam</span>
            <select value={season} onChange={(event) => setSeason(event.target.value)} disabled={!seasons.length}>
              <option value="all">Semua musim</option>
              {seasons.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </header>

      {error && <p className="error-message form-message" role="alert">{error}</p>}

      <section className="village-summary-grid" aria-label="Ringkasan data pertanian">
        <SummaryCard icon={MapPin} tone="green" label="Jumlah Desa" value={integerFormat.format(villages.length)} note="Dalam Kecamatan Karangampel" />
        <SummaryCard
          icon={Sprout}
          tone="leaf"
          label="Total Luas Sawah"
          value={totalArea ? `${numberFormat.format(totalArea)} ha` : "Belum tersedia"}
          note={`${villages.filter((village) => village.area_hectare > 0).length} desa memiliki data luas`}
        />
        <SummaryCard
          icon={UsersRound}
          tone="sky"
          label="Jumlah Petani"
          value={totalFarmers ? integerFormat.format(totalFarmers) : "Belum tersedia"}
          note={`${villages.filter((village) => village.farmer_count > 0).length} desa memiliki data petani`}
        />
        <SummaryCard icon={Droplets} tone="blue" label="Rata-rata Ketersediaan Air" value={`${average("water_availability")}${average("water_availability") === "—" ? "" : "%"}`} note="Catatan tervalidasi terbaru" />
        <SummaryCard icon={Activity} tone="purple" label="Rata-rata Umur Tanaman" value={`${average("plant_age")}${average("plant_age") === "—" ? "" : " hari"}`} note="Catatan tervalidasi terbaru" />
      </section>

      <section className="village-workspace">
        <article className="village-table-panel">
          <div className="village-toolbar">
            <label className="village-search">
              <Search size={18} />
              <input
                type="search"
                placeholder="Cari nama desa..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Cari nama desa"
              />
            </label>
            <label className="village-filter">
              <span><ArrowUpDown size={13} /> Urutkan</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="name">Nama Desa (A-Z)</option>
                <option value="area">Luas Sawah Terbesar</option>
                <option value="score">Skor Prioritas</option>
              </select>
            </label>
            <label className="village-filter">
              <span>Status Prioritas</span>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="all">Semua</option>
                {Object.entries(categoryInfo).map(([key, info]) => <option key={key} value={key}>{info.label}</option>)}
              </select>
            </label>
            <label className="village-filter">
              <span>Kondisi Saluran</span>
              <select value={canalFilter} onChange={(event) => setCanalFilter(event.target.value)}>
                <option value="all">Semua</option>
                <option value="baik">Baik</option>
                <option value="sedang">Sedang</option>
                <option value="buruk">Buruk</option>
              </select>
            </label>
            <Link className="village-add-button" to="/input-data"><Plus size={17} /> Tambah Data</Link>
          </div>

          {loading ? <p className="village-loading">Memuat data desa...</p> : (
            <>
              <div className="village-table-scroll">
                <table className="village-data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Desa</th>
                      <th>Luas Sawah<br />(ha)</th>
                      <th>Jumlah<br />Petani</th>
                      <th>Ketersediaan<br />Air (%)</th>
                      <th>Kebutuhan<br />Air (%)</th>
                      <th>Umur Tanaman<br />(hari)</th>
                      <th>Kondisi<br />Saluran</th>
                      <th>Skor</th>
                      <th>Status Prioritas</th>
                      <th>Status Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((village, index) => {
                      const status = village.record?.validation_status || "no-record";
                      const category = village.analysis && categoryInfo[village.analysis.category];
                      return (
                        <tr
                          key={village.id}
                          className={selectedVillageId === village.id ? "is-selected" : ""}
                        >
                          <td>{index + 1}</td>
                          <td><button type="button" className="village-name-button" aria-pressed={selectedVillageId === village.id} onClick={() => { setSelectedVillageId(village.id); setSelectedTab("umum"); }}>{village.name}</button></td>
                          <td>{village.area_hectare > 0 ? numberFormat.format(village.area_hectare) : "—"}</td>
                          <td>{village.farmer_count > 0 ? integerFormat.format(village.farmer_count) : "—"}</td>
                          <td>{village.record ? `${numberFormat.format(village.record.water_availability)}%` : "—"}</td>
                          <td>{village.record ? `${numberFormat.format(village.record.water_demand)}%` : "—"}</td>
                          <td>{village.record ? village.record.plant_age : "—"}</td>
                          <td>{village.record ? village.record.canal_condition[0].toUpperCase() + village.record.canal_condition.slice(1) : "—"}</td>
                          <td className="village-score-cell">{village.analysis ? numberFormat.format(village.analysis.score) : "—"}</td>
                          <td>
                            {category ? (
                              <span className="village-priority-badge" style={{ "--priority-color": category.color }}>{category.label}</span>
                            ) : <span className="village-muted-status">—</span>}
                          </td>
                          <td>
                            <span className={`village-validation-badge ${status}`}>
                              {status === "no-record" ? "Belum ada data" : validationLabel(status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredRows.length && !error && (
                      <tr><td className="village-no-results" colSpan="11">Desa tidak ditemukan atau tidak sesuai filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="village-table-footer">
                <span>{visibleRange}</span>
                <span>{season === "all" ? "Semua musim tanam" : season}</span>
              </div>
            </>
          )}
        </article>

        <aside className="village-detail-panel">
          {selectedVillage ? (
            <>
              <div
                className="village-detail-cover"
                role="img"
                aria-label="Ilustrasi area sawah dan saluran irigasi, bukan foto spesifik desa"
                style={{ backgroundImage: `linear-gradient(0deg, rgba(12, 38, 29, 0.86), rgba(12, 38, 29, 0.04) 82%), url(${irrigationField})` }}
              >
                <span className="village-cover-caption">Ilustrasi pertanian</span>
                <div className="village-cover-content">
                  <span
                    className="village-priority-badge village-cover-badge"
                    style={{ "--priority-color": categoryInfo[selectedVillage.analysis?.category]?.color || "#77847d" }}
                  >
                    {categoryInfo[selectedVillage.analysis?.category]?.label || "Belum dianalisis"}
                  </span>
                  <h2>Desa {selectedVillage.name}</h2>
                  <p>Kecamatan Karangampel, Kabupaten Indramayu</p>
                </div>
              </div>

              <div className="village-detail-titlebar">
                <div><h3>Detail Data Desa</h3><span>{selectedVillage.record ? formatDate(selectedVillage.record.recorded_at) : "Belum ada pencatatan irigasi"}</span></div>
                <Link className="village-edit-link" to="/input-data"><Pencil size={14} /> Perbarui Data</Link>
              </div>

              <div className="village-detail-tabs" role="tablist" aria-label="Kategori detail desa">
                {[["umum", "Informasi Umum"], ["pertanian", "Data Pertanian"], ["irigasi", "Kondisi Irigasi"]].map(([key, label]) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedTab === key}
                    className={selectedTab === key ? "active" : ""}
                    key={key}
                    onClick={() => setSelectedTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {selectedTab === "umum" && (
                <dl className="village-detail-list">
                  <div><dt>Nama Desa</dt><dd>{selectedVillage.name}</dd></div>
                  <div><dt>Luas Sawah</dt><dd>{selectedVillage.area_hectare > 0 ? `${numberFormat.format(selectedVillage.area_hectare)} ha` : "Belum tersedia"}</dd></div>
                  <div><dt>Jumlah Petani</dt><dd>{selectedVillage.farmer_count > 0 ? `${integerFormat.format(selectedVillage.farmer_count)} orang` : "Belum tersedia"}</dd></div>
                  <div><dt>Koordinat</dt><dd>{selectedVillage.latitude != null && selectedVillage.longitude != null ? `${numberFormat.format(selectedVillage.latitude)}, ${numberFormat.format(selectedVillage.longitude)}` : "Belum tersedia"}</dd></div>
                </dl>
              )}

              {selectedTab === "pertanian" && (
                <dl className="village-detail-list">
                  <div><dt>Musim Tanam</dt><dd>{displayValue(selectedVillage.record?.planting_season)}</dd></div>
                  <div><dt>Umur Tanaman</dt><dd>{selectedVillage.record ? `${selectedVillage.record.plant_age} hari` : "Belum tersedia"}</dd></div>
                  <div><dt>Curah Hujan</dt><dd>{selectedVillage.record?.rainfall == null ? "Belum tersedia" : `${numberFormat.format(selectedVillage.record.rainfall)} mm`}</dd></div>
                  <div><dt>Tanggal Catatan</dt><dd>{formatDate(selectedVillage.record?.recorded_at)}</dd></div>
                </dl>
              )}

              {selectedTab === "irigasi" && (
                <>
                  <dl className="village-detail-list">
                    <div><dt>Ketersediaan Air</dt><dd>{selectedVillage.record ? `${numberFormat.format(selectedVillage.record.water_availability)}%` : "Belum tersedia"}</dd></div>
                    <div><dt>Kebutuhan Air</dt><dd>{selectedVillage.record ? `${numberFormat.format(selectedVillage.record.water_demand)}%` : "Belum tersedia"}</dd></div>
                    <div><dt>Kondisi Saluran</dt><dd>{selectedVillage.record ? selectedVillage.record.canal_condition[0].toUpperCase() + selectedVillage.record.canal_condition.slice(1) : "Belum tersedia"}</dd></div>
                    <div><dt>Status Validasi</dt><dd>{selectedVillage.record ? validationLabel(selectedVillage.record.validation_status) : "Belum ada data"}</dd></div>
                    <div><dt>Skor Prioritas</dt><dd>{selectedVillage.analysis ? `${numberFormat.format(selectedVillage.analysis.score)} / 100` : "Belum dianalisis"}</dd></div>
                  </dl>
                  {selectedVillage.analysis?.active_rules?.length > 0 && (
                    <div className="village-priority-reason">
                      <strong><Sprout size={15} /> Aturan Fuzzy Aktif</strong>
                      <ul>{selectedVillage.analysis.active_rules.slice(0, 2).map((rule, index) => <li key={`${selectedVillage.id}-rule-${index}`}>{rule.text}</li>)}</ul>
                    </div>
                  )}
                </>
              )}

              <Link className="village-analysis-link" to="/analisis-ai">Lihat analisis AI desa ini <ChevronRight size={16} /></Link>
            </>
          ) : (
            <div className="village-detail-empty">Pilih desa untuk melihat detailnya.</div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default DataDesa;
