import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  Droplets,
  House,
  MapPin,
  Sprout,
  UsersRound,
  Waves,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api";
import { useAuthUser } from "../auth-context";

const categoryInfo = {
  sangat_tinggi: { label: "Sangat tinggi", color: "#e9434e" },
  tinggi: { label: "Tinggi", color: "#f5823b" },
  sedang: { label: "Sedang", color: "#f5c746" },
  rendah: { label: "Rendah", color: "#42b96b" },
};

const networkPositions = {
  Mundu: { x: 445, y: 70, branch: "A" },
  Kaplonganlor: { x: 540, y: 135, branch: "A" },
  Tanjungpura: { x: 700, y: 92, branch: "A" },
  Tanjungsari: { x: 420, y: 195, branch: "B" },
  Pringgacala: { x: 540, y: 240, branch: "B" },
  Benda: { x: 690, y: 200, branch: "B" },
  Sendang: { x: 555, y: 315, branch: "B" },
  "Karangampel Kidul": { x: 400, y: 420, branch: "C" },
  Karangampel: { x: 570, y: 380, branch: "C" },
  "Dukuh Jeruk": { x: 730, y: 430, branch: "C" },
  "Dukuh Tengah": { x: 750, y: 320, branch: "C" },
};

const branchPositions = {
  A: { x: 275, y: 125, label: "Cabang A" },
  B: { x: 275, y: 240, label: "Cabang B" },
  C: { x: 275, y: 355, label: "Cabang C" },
};

const formatNumber = (value, digits = 0) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

const formatDate = (value) => {
  if (!value) return "Belum ada pencatatan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum ada pencatatan";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

function PriorityNetwork({ villages, results }) {
  const resultByVillage = new Map(results.map((item) => [item.village_name, item]));
  const listedVillages = villages.map((village, index) => {
    const knownPosition = networkPositions[village.name];
    const fallbackBranch = ["A", "B", "C"][index % 3];
    const fallbackPosition = {
      x: 430 + (index % 4) * 105,
      y: 95 + Math.floor(index / 4) * 115,
      branch: fallbackBranch,
    };
    return {
      ...village,
      ...(knownPosition || fallbackPosition),
      result: resultByVillage.get(village.name),
    };
  });

  return (
    <div className="dashboard-network-wrap">
      <svg
        className="dashboard-network"
        viewBox="0 0 900 470"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Skema abstrak cabang jaringan dan prioritas desa"
      >
        <defs>
          <linearGradient id="network-water" x1="0" x2="1">
            <stop offset="0%" stopColor="#39a9d2" />
            <stop offset="100%" stopColor="#157c91" />
          </linearGradient>
        </defs>
        {Object.entries(branchPositions).map(([key, branch]) => (
          <g key={`source-${key}`}>
            <line className="dashboard-network-edge" x1="85" y1="240" x2={branch.x} y2={branch.y} />
            <line className="dashboard-network-edge" x1={branch.x} y1={branch.y} x2="355" y2={branch.y} />
          </g>
        ))}
        {listedVillages.map((village) => {
          const branch = branchPositions[village.branch];
          return (
            <line
              className="dashboard-network-edge"
              key={`edge-${village.id}`}
              x1="355"
              y1={branch.y}
              x2={village.x}
              y2={village.y}
            />
          );
        })}
        <g className="dashboard-network-source">
          <circle cx="85" cy="240" r="24" />
          <path d="M85 226c-7 10-10 14-10 19a10 10 0 0 0 20 0c0-5-3-9-10-19Z" />
          <text x="85" y="283" textAnchor="middle">Sumber air</text>
          <text className="dashboard-network-small" x="85" y="301" textAnchor="middle">simulasi</text>
        </g>
        {Object.entries(branchPositions).map(([key, branch]) => (
          <g className="dashboard-network-branch" key={key}>
            <circle cx={branch.x} cy={branch.y} r="9" />
            <text x={branch.x} y={branch.y - 17} textAnchor="middle">{branch.label}</text>
          </g>
        ))}
        {listedVillages.map((village) => {
          const color = categoryInfo[village.result?.category]?.color || "#9aa9a4";
          return (
            <g className="dashboard-network-village" key={village.id}>
              <circle cx={village.x} cy={village.y} r="10" fill={color} />
              <text
                x={village.x >= 760 ? village.x - 14 : village.x + 14}
                y={village.y + 4}
                textAnchor={village.x >= 760 ? "end" : "start"}
                paintOrder="stroke"
                stroke="#f9fcfa"
                strokeLinejoin="round"
                strokeWidth="4"
              >
                {village.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className="dashboard-metric">
      <div className={`dashboard-metric-icon ${tone}`}><Icon size={27} strokeWidth={2.2} /></div>
      <div className="dashboard-metric-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function PanelHeading({ title, subtitle, action }) {
  return (
    <div className="dashboard-panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Dashboard() {
  const user = useAuthUser();
  const [villages, setVillages] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [season, setSeason] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [villageResponse, analysisResponse] = await Promise.all([
          api.get("/api/villages/"),
          api.get("/api/analysis/"),
        ]);
        setVillages(villageResponse.data);
        setAnalysis(analysisResponse.data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.detail ||
            "Gagal mengambil ringkasan. Pastikan backend berjalan.",
        );
      }
    };
    fetchDashboard();
  }, []);

  const visibleVillages = user.role === "admin"
    ? villages
    : villages.filter((village) => village.id === user.assigned_village_id);
  const allResults = analysis?.results || [];
  const seasons = [...new Set(allResults.map((item) => item.inputs?.planting_season).filter(Boolean))];
  const selectedResults = season === "all"
    ? allResults
    : allResults.filter((item) => item.inputs?.planting_season === season);
  const results = [...selectedResults].sort((first, second) => second.score - first.score);

  const areaKnown = visibleVillages.filter((village) => village.area_hectare > 0);
  const farmersKnown = visibleVillages.filter((village) => village.farmer_count > 0);
  const totalArea = areaKnown.reduce((total, village) => total + village.area_hectare, 0);
  const totalFarmers = farmersKnown.reduce((total, village) => total + village.farmer_count, 0);
  const average = (key) => {
    const values = results
      .map((item) => Number(item.inputs?.[key]))
      .filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const averageAvailability = average("water_availability");
  const averageDemand = average("water_demand");
  const averagePlantAge = average("plant_age");
  const canalCounts = results.reduce((counts, item) => {
    const condition = item.inputs?.canal_condition;
    if (condition) counts[condition] = (counts[condition] || 0) + 1;
    return counts;
  }, {});
  const dominantCanal = Object.entries(canalCounts).sort((first, second) => second[1] - first[1])[0]?.[0];
  const categoryData = Object.entries(categoryInfo).map(([key, info]) => ({
    key,
    name: info.label,
    color: info.color,
    value: results.filter((item) => item.category === key).length,
  }));
  const latestRecord = allResults
    .map((item) => item.recorded_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  const topResults = results.slice(0, 5);
  const rankedResults = results.map((result, index) => ({
    ...result,
    rank: index + 1,
    shortName: result.village_name.length > 15
      ? `${result.village_name.slice(0, 13)}…`
      : result.village_name,
  }));
  const seasonLabel = season === "all" ? "Semua musim" : season;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard Utama</h1>
          <p>Ringkasan kondisi irigasi dan hasil analisis prioritas distribusi air di Kecamatan Karangampel.</p>
        </div>
        <div className="dashboard-header-tools">
          <div className="dashboard-date">
            <CalendarDays size={22} />
            <span><strong>Data terakhir</strong><small>{formatDate(latestRecord)}</small></span>
          </div>
          <label className="dashboard-season">
            <span>Musim tanam</span>
            <select value={season} onChange={(event) => setSeason(event.target.value)} disabled={!seasons.length}>
              <option value="all">Semua musim</option>
              {seasons.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </header>

      {error && <p className="error-message form-message">{error}</p>}
      {user.role !== "admin" && !user.assigned_village_id && (
        <div className="info-banner">Akun Petugas Anda belum ditugaskan ke desa. Hubungi Admin agar dapat melihat dashboard dan mencatat data.</div>
      )}

      <section className="dashboard-metrics" aria-label="Ringkasan data desa">
        <MetricCard icon={House} tone="blue" label="Jumlah desa" value={visibleVillages.length} detail="Desa dalam cakupan akun" />
        <MetricCard
          icon={Sprout}
          tone="green"
          label="Luas sawah terdata"
          value={totalArea ? `${formatNumber(totalArea, 1)} ha` : "Belum tersedia"}
          detail={`${areaKnown.length} dari ${visibleVillages.length} desa memiliki data luas`}
        />
        <MetricCard
          icon={UsersRound}
          tone="sky"
          label="Petani terdata"
          value={totalFarmers ? formatNumber(totalFarmers) : "Belum tersedia"}
          detail={`${farmersKnown.length} dari ${visibleVillages.length} desa memiliki data petani`}
        />
        <MetricCard icon={Activity} tone="purple" label="Desa dianalisis" value={results.length} detail={`Hasil untuk ${seasonLabel.toLowerCase()}`} />
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-network-panel">
          <PanelHeading
            title="Skema Prioritas Desa"
            subtitle="Visualisasi abstrak simpul desa berdasarkan kategori hasil Fuzzy."
            action={<Link className="dashboard-panel-link" to="/peta-prioritas">Lihat daftar</Link>}
          />
          {visibleVillages.length ? (
            <PriorityNetwork villages={visibleVillages} results={results} />
          ) : (
            <div className="dashboard-empty">Belum ada desa yang dapat ditampilkan untuk akun ini.</div>
          )}
          <div className="dashboard-legend">
            {Object.entries(categoryInfo).map(([key, info]) => (
              <span key={key}><i style={{ background: info.color }} />{info.label}</span>
            ))}
            <span><i className="dashboard-legend-muted" />Belum dianalisis</span>
          </div>
          <small className="dashboard-map-note">Skema jaringan simulasi — bukan peta geografis atau batas wilayah terverifikasi.</small>
        </article>

        <div className="dashboard-side-stack">
          <article className="dashboard-panel dashboard-distribution-panel">
            <PanelHeading title="Distribusi Tingkat Prioritas" subtitle={`Kategori pada ${seasonLabel.toLowerCase()}`} />
            {results.length ? (
              <div className="dashboard-donut-layout">
                <div className="dashboard-donut">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="91%" paddingAngle={2} stroke="none">
                        {categoryData.map((item) => <Cell key={item.key} fill={item.color} />)}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} desa`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="dashboard-donut-total"><strong>{results.length}</strong><span>desa</span></div>
                </div>
                <div className="dashboard-distribution-legend">
                  {categoryData.map((item) => (
                    <div key={item.key}>
                      <i style={{ background: item.color }} />
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="dashboard-empty dashboard-empty-compact">Belum ada hasil analisis untuk musim ini.</div>}
          </article>

          <article className="dashboard-panel dashboard-top-panel">
            <PanelHeading
              title="Top 5 Desa Prioritas"
              action={<Link className="dashboard-panel-link" to="/analisis-ai">Lihat semua</Link>}
            />
            {topResults.length ? (
              <ol className="dashboard-top-list">
                {topResults.map((item, index) => (
                  <li key={item.village_id}>
                    <span className="dashboard-rank">{index + 1}</span>
                    <span className="dashboard-top-name">{item.village_name}</span>
                    <span className="dashboard-score-track"><i style={{ width: `${Math.max(0, Math.min(100, item.score))}%`, background: categoryInfo[item.category]?.color || "#15935b" }} /></span>
                    <strong>{formatNumber(item.score, 1)}</strong>
                  </li>
                ))}
              </ol>
            ) : <div className="dashboard-empty dashboard-empty-compact">Jalankan analisis setelah data divalidasi.</div>}
          </article>
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-panel dashboard-chart-panel">
          <PanelHeading title="Perbandingan Skor Prioritas Desa" subtitle="Skor Fuzzy Logic, skala 0–100." />
          {rankedResults.length ? (
            <div className="dashboard-bar-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankedResults} margin={{ top: 22, right: 12, left: -14, bottom: 52 }}>
                  <CartesianGrid stroke="#e9eef0" vertical={false} />
                  <XAxis dataKey="shortName" interval={0} angle={-32} textAnchor="end" height={66} tick={{ fontSize: 11, fill: "#667085" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#667085" }} />
                  <Tooltip formatter={(value) => [`${formatNumber(Number(value), 1)}`, "Skor prioritas"]} />
                  <Bar dataKey="score" radius={[5, 5, 0, 0]} maxBarSize={42}>
                    {rankedResults.map((item) => <Cell key={item.village_id} fill={categoryInfo[item.category]?.color || "#15935b"} />)}
                    <LabelList dataKey="score" position="top" formatter={(value) => formatNumber(Number(value), 1)} style={{ fontSize: 10, fill: "#344054", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="dashboard-empty">Grafik akan muncul setelah Admin menjalankan analisis data tervalidasi.</div>}
        </article>

        <article className="dashboard-panel dashboard-condition-panel">
          <PanelHeading title="Kondisi Umum" subtitle="Rata-rata dari catatan yang dianalisis." />
          <div className="dashboard-condition-grid">
            <div className="dashboard-condition-item">
              <span className="dashboard-condition-icon blue"><Droplets size={23} /></span>
              <div><small>Ketersediaan air</small><strong>{averageAvailability == null ? "—" : `${formatNumber(averageAvailability, 1)}%`}</strong><span>Rata-rata ketersediaan</span></div>
            </div>
            <div className="dashboard-condition-item">
              <span className="dashboard-condition-icon green"><Sprout size={23} /></span>
              <div><small>Kebutuhan air</small><strong>{averageDemand == null ? "—" : `${formatNumber(averageDemand, 1)}%`}</strong><span>Rata-rata kebutuhan</span></div>
            </div>
            <div className="dashboard-condition-item">
              <span className="dashboard-condition-icon green"><Activity size={23} /></span>
              <div><small>Umur tanaman</small><strong>{averagePlantAge == null ? "—" : `${formatNumber(averagePlantAge)} hari`}</strong><span>Rata-rata umur tanaman</span></div>
            </div>
            <div className="dashboard-condition-item">
              <span className="dashboard-condition-icon purple"><Waves size={23} /></span>
              <div><small>Kondisi saluran</small><strong>{dominantCanal ? dominantCanal[0].toUpperCase() + dominantCanal.slice(1) : "—"}</strong><span>Kondisi terbanyak pada data</span></div>
            </div>
          </div>
          <div className="dashboard-location"><MapPin size={16} /> Kecamatan Karangampel, Kabupaten Indramayu</div>
        </article>
      </section>
    </div>
  );
}

export default Dashboard;
