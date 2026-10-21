import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Droplets, Download, ShieldAlert, Target } from "lucide-react";
import api from "../api";
import { useAuthUser } from "../auth-context";
import useAnalysis from "../hooks/useAnalysis";

const categoryInfo = {
  sangat_tinggi: { label: "Sangat tinggi", color: "#e9434e" },
  tinggi: { label: "Tinggi", color: "#f5823b" },
  sedang: { label: "Sedang", color: "#f5c746" },
  rendah: { label: "Rendah", color: "#42b96b" },
};

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const emptyResults = [];
const dummyBaseSupplyM3 = 10000;
const allocationColors = ["#2f80ed", "#64a6e8", "#f47b4d", "#f39257", "#f5b422", "#f0c927", "#b6d79c", "#76c68c", "#4caf70", "#b4d9ec", "#a0cbee"];
const scenarioPresets = [25, 50, 100, 150].map((percentage) => ({
  percentage,
  supplyM3: dummyBaseSupplyM3 * percentage / 100,
}));
const dummyVillageData = [
  { name: "Tanjungpura", demandM3: 2300, points: "343,25 482,40 500,87 354,112", x: 420, y: 69 },
  { name: "Mundu", demandM3: 2000, points: "200,20 343,25 354,112 215,110", x: 278, y: 66 },
  { name: "Sendang", demandM3: 1800, points: "389,126 500,110 535,170 520,225 401,218", x: 461, y: 174 },
  { name: "Benda", demandM3: 1600, points: "267,118 389,126 401,218 279,225", x: 340, y: 173 },
  { name: "Karangampel", demandM3: 1500, points: "157,226 279,230 289,337 179,326", x: 227, y: 281 },
  { name: "Kaplonganlor", demandM3: 1300, points: "70,30 200,20 215,110 85,126 52,78", x: 132, y: 70 },
  { name: "Tanjungsari", demandM3: 1200, points: "52,130 145,124 157,220 38,229 21,180", x: 89, y: 176 },
  { name: "Pringgacala", demandM3: 1100, points: "145,124 267,118 279,225 157,220", x: 216, y: 174 },
  { name: "Karangampel Kidul", demandM3: 1000, points: "38,236 157,226 179,326 78,350 35,300", x: 105, y: 286 },
  { name: "Dukuh Jeruk", demandM3: 900, points: "279,230 401,224 400,325 289,337", x: 342, y: 282 },
  { name: "Dukuh Tengah", demandM3: 700, points: "401,224 520,232 532,300 400,325", x: 465, y: 278 },
];
const formatM3 = (value) => `${numberFormat.format(value)} m³`;

function getProportionalAllocations(villages, supplyM3, totalDemandM3) {
  if (totalDemandM3 <= 0) return new Map(villages.map((village) => [village.name, 0]));
  const tenthsToAllocate = Math.round(Math.min(supplyM3, totalDemandM3) * 10);
  const allocations = villages.map((village) => {
    const exactTenths = tenthsToAllocate * village.demandM3 / totalDemandM3;
    return { name: village.name, tenths: Math.floor(exactTenths), remainder: exactTenths % 1 };
  });
  const remaining = tenthsToAllocate - allocations.reduce((total, village) => total + village.tenths, 0);
  const remainderOrder = [...allocations].sort((first, second) => second.remainder - first.remainder);
  for (let index = 0; index < remaining; index += 1) remainderOrder[index].tenths += 1;
  return new Map(allocations.map((village) => [village.name, village.tenths / 10]));
}

function mapBand(value, layer) {
  if (layer === "demand") {
    if (value < 1000) return "band-one";
    if (value < 1500) return "band-two";
    if (value < 2000) return "band-three";
    return "band-four";
  }
  if (value < 500) return "band-one";
  if (value < 1000) return "band-two";
  if (value < 1500) return "band-three";
  return "band-four";
}

function SummaryCard({ icon: Icon, tone, label, value, detail }) {
  return (
    <article className="recommendation-summary-card">
      <span className={`recommendation-summary-icon ${tone}`}><Icon size={23} /></span>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

function PanelHeading({ title, subtitle, action }) {
  return (
    <div className="recommendation-panel-heading">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action}
    </div>
  );
}

function AllocationMap({ villages, supplyM3, selectedId, onSelect }) {
  const [layer, setLayer] = useState("demand");
  const selected = villages.find((village) => village.result?.village_id === selectedId);
  const legend = layer === "demand"
    ? ["< 1.000 m³", "1.000–1.499 m³", "1.500–1.999 m³", "≥ 2.000 m³"]
    : ["< 500 m³", "500–999 m³", "1.000–1.499 m³", "≥ 1.500 m³"];

  return (
    <article className="recommendation-panel recommendation-demand-map-panel">
      <PanelHeading
        title="Peta Kebutuhan Air per Desa"
        subtitle="Kebutuhan memakai input tervalidasi; nilai kosong memakai contoh demo."
        action={<label className="recommendation-map-layer">Tampilkan
          <select value={layer} onChange={(event) => setLayer(event.target.value)}>
            <option value="allocation">Alokasi air (m³)</option>
            <option value="demand">Kebutuhan air (m³)</option>
          </select>
        </label>}
      />
      <div className="recommendation-demand-map-scroll" role="region" aria-label="Peta dummy batas desa dan distribusi air" tabIndex={0}>
        <svg className="recommendation-demand-map" viewBox="0 0 560 370" role="img" aria-label={`Peta batas desa dummy, diwarnai berdasarkan ${layer === "allocation" ? "alokasi" : "kebutuhan"} air dalam meter kubik`}>
          <rect className="recommendation-demand-map-background" x="0" y="0" width="560" height="370" rx="12" />
          {villages.map((village) => {
            const value = layer === "allocation" ? village.allocationM3 : village.demandM3;
            const result = village.result;
            const isSelected = result?.village_id === selectedId;
            return (
              <g
                className={`recommendation-demand-tile ${mapBand(value, layer)}${isSelected ? " is-selected" : ""}${result ? " has-data" : ""}`}
                key={village.name}
                role={result ? "button" : undefined}
                tabIndex={result ? 0 : undefined}
                aria-label={`${village.name}: ${layer === "allocation" ? "alokasi simulasi" : village.isDemoDemand ? "kebutuhan demo" : "kebutuhan dari input"} ${formatM3(value)}`}
                onClick={() => result && onSelect(result.village_id)}
                onKeyDown={(event) => {
                  if (result && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onSelect(result.village_id);
                  }
                }}
              >
                <polygon points={village.points} />
                <text x={village.x} y={village.y - 4} className="recommendation-demand-name">{village.name}</text>
                <text x={village.x} y={village.y + 15} className="recommendation-demand-value">{formatM3(value)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="recommendation-demand-legend" aria-label={`Legenda ${layer === "allocation" ? "alokasi" : "kebutuhan"} air`}>
        {legend.map((label, index) => <span key={label}><i className={`demand-band-${index + 1}`} />{label}</span>)}
      </div>
      <p className="recommendation-demand-note">Pasokan {formatM3(supplyM3)} masih simulasi. Kebutuhan m³ mengikuti Input Data jika tersedia; batas desa pada peta tetap skematik, bukan batas geografis resmi.</p>
      {selected && <p className="recommendation-demand-selected">Dipilih: <strong>{selected.name}</strong> · skor Fuzzy {numberFormat.format(selected.result.score)}/100</p>}
    </article>
  );
}

function Rekomendasi() {
  const user = useAuthUser();
  const { analysis, loading, error } = useAnalysis();
  const [irrigationRecords, setIrrigationRecords] = useState([]);
  const [villageNames, setVillageNames] = useState([]);
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [demoSupplyM3, setDemoSupplyM3] = useState(dummyBaseSupplyM3);
  useEffect(() => {
    let isActive = true;
    Promise.all([api.get("/api/villages/"), api.get("/api/irrigation/")])
      .then(([villageResponse, irrigationResponse]) => {
        if (!isActive) return;
        setVillageNames(villageResponse.data);
        setIrrigationRecords(irrigationResponse.data);
      })
      .catch(() => {
        if (isActive) {
          setVillageNames([]);
          setIrrigationRecords([]);
        }
      });
    return () => { isActive = false; };
  }, []);
  const allResults = analysis?.results || emptyResults;
  const seasons = useMemo(
    () => [...new Set(allResults.map((result) => result.inputs.planting_season).filter(Boolean))].sort(),
    [allResults],
  );
  const results = useMemo(() => allResults
    .filter((result) => seasonFilter === "all" || result.inputs.planting_season === seasonFilter)
    .sort((first, second) => second.score - first.score || first.village_name.localeCompare(second.village_name)),
  [allResults, seasonFilter]);
  const selectedResult = results.find((result) => result.village_id === selectedId) || results[0];
  const highestPriority = results[0];
  const urgentCount = results.filter((result) => ["sangat_tinggi", "tinggi"].includes(result.category)).length;
  const resultByName = new Map(results.map((result) => [result.village_name, result]));
  const villageNameById = new Map(villageNames.map((village) => [Number(village.id), village.name]));
  const latestRecordByVillage = new Map();
  irrigationRecords
    .filter((record) => record.validation_status === "validated" && (seasonFilter === "all" || record.planting_season === seasonFilter))
    .sort((first, second) => second.recorded_at.localeCompare(first.recorded_at) || second.id - first.id)
    .forEach((record) => {
      const name = villageNameById.get(Number(record.village_id));
      if (name && !latestRecordByVillage.has(name)) latestRecordByVillage.set(name, record);
    });
  const baseVillageRows = dummyVillageData.map((village, index) => {
    const result = resultByName.get(village.name);
    const latestRecord = latestRecordByVillage.get(village.name);
    const hasSavedDemand = latestRecord?.water_demand_m3 != null;
    return {
      ...village,
      result,
      demandM3: hasSavedDemand ? Number(latestRecord.water_demand_m3) : village.demandM3,
      isDemoDemand: !hasSavedDemand,
      allocationColor: allocationColors[index],
    };
  });
  const totalDemandM3 = baseVillageRows.reduce((total, village) => total + village.demandM3, 0);
  const totalAllocatedM3 = Math.min(demoSupplyM3, totalDemandM3);
  const demoDeficitM3 = Math.max(0, totalDemandM3 - demoSupplyM3);
  const demoSurplusM3 = Math.max(0, demoSupplyM3 - totalDemandM3);
  const coveragePercent = totalDemandM3 ? totalAllocatedM3 / totalDemandM3 * 100 : 0;
  const allocations = getProportionalAllocations(baseVillageRows, demoSupplyM3, totalDemandM3);
  const villageRows = baseVillageRows.map((village) => {
    const allocationM3 = allocations.get(village.name);
    return {
      ...village,
      allocationM3,
      allocationShare: totalAllocatedM3 ? allocationM3 / totalAllocatedM3 * 100 : 0,
    };
  }).sort((first, second) => {
    if (first.result && second.result) return second.result.score - first.result.score;
    if (first.result) return -1;
    if (second.result) return 1;
    return 0;
  });
  const chartResults = results.map((result) => ({
    ...result,
    demand: result.inputs.water_demand,
    availability: result.inputs.water_availability,
  }));
  const exportCsv = () => {
    const rows = [
      ["Peringkat Fuzzy", "Nama Desa", "Skor Fuzzy", "Kategori", "Kebutuhan Air (m3)", "Alokasi Air Simulasi (m3)", "Porsi Alokasi (%)", "Ketersediaan Data (%)", "Kebutuhan Data (%)", "Umur Tanaman (hari)", "Kondisi Saluran", "Musim Tanam"],
      ...villageRows.map((village) => [
        village.result ? results.findIndex((result) => result.village_id === village.result.village_id) + 1 : "",
        village.name,
        village.result?.score ?? "",
        categoryInfo[village.result?.category]?.label || "Belum dianalisis",
        village.demandM3,
        village.allocationM3,
        numberFormat.format(village.allocationShare),
        village.result?.inputs.water_availability ?? "",
        village.result?.inputs.water_demand ?? "",
        village.result?.inputs.plant_age ?? "",
        village.result?.inputs.canal_condition ?? "",
        village.result?.inputs.planting_season ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const downloadUrl = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "rekomendasi-prioritas-desa.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  return (
    <div className="recommendation-page">
      <header className="recommendation-page-header">
        <div>
          <h1>Rekomendasi Distribusi Air</h1>
          <p>Ranking memakai hasil Fuzzy. Kebutuhan m³ mengikuti Input Data; alokasi dihitung dari pasokan simulasi.</p>
        </div>
        <label className="recommendation-season-filter">Musim Tanam
          <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>
            <option value="all">Semua musim</option>
            {seasons.map((season) => <option value={season} key={season}>{season}</option>)}
          </select>
        </label>
      </header>

      {error && <p className="error-message form-message" role="alert">{error}</p>}
      {loading ? <p className="priority-loading">Memuat rekomendasi...</p> : !results.length ? (
        <div className="priority-empty-state">
          <span><Target size={25} /></span>
          <h2>Rekomendasi belum tersedia</h2>
          <p>Pastikan ada data irigasi tervalidasi dan analisis AI sudah dijalankan.</p>
        </div>
      ) : (
        <>
          <div className="recommendation-demo-banner"><strong>SIMULASI</strong><span>Kebutuhan m³ memakai catatan tervalidasi dari Input Data. Desa yang belum memiliki nilai m³ memakai angka demo; pasokan dan batas peta tetap simulasi.</span></div>
          <section className="recommendation-summary-grid" aria-label="Ringkasan rekomendasi">
            <SummaryCard icon={Droplets} tone="blue" label="Total ketersediaan air" value={formatM3(demoSupplyM3)} detail="Pasokan simulasi; dapat diubah di skenario" />
            <SummaryCard icon={Activity} tone="green" label="Total kebutuhan air" value={formatM3(totalDemandM3)} detail={`${baseVillageRows.filter((village) => village.isDemoDemand).length} desa memakai nilai demo`} />
            <SummaryCard icon={ShieldAlert} tone="red" label="Defisit air" value={formatM3(demoDeficitM3)} detail="Kebutuhan dikurangi pasokan" />
            <SummaryCard icon={Target} tone="amber" label="Metode alokasi" value="Proporsional" detail="Contoh alokasi berdasarkan kebutuhan" />
          </section>

          <section className="recommendation-main-grid">
            <article className="recommendation-panel recommendation-ranking-panel">
              <PanelHeading
                title="Rekomendasi Alokasi Air per Desa"
                subtitle="Kebutuhan m³ mengikuti Input Data; alokasi dibagi proporsional dari pasokan simulasi."
                action={<button className="priority-export-button" type="button" onClick={exportCsv}><Download size={15} />Export Data</button>}
              />
              <div className="recommendation-table-wrap">
                <table className="recommendation-table">
                  <thead><tr><th>No</th><th>Nama Desa</th><th>Skor Fuzzy</th><th>Kebutuhan (m³)</th><th>Alokasi (m³)</th><th>Bagian (%)</th><th>Status</th><th>Aksi</th></tr></thead>
                  <tbody>{villageRows.map((village, index) => (
                    <tr className={selectedResult?.village_id === village.result?.village_id ? "is-selected" : ""} key={village.name}>
                      <td>{village.result ? index + 1 : "—"}</td>
                      <td><strong>{village.name}</strong></td>
                      <td>{village.result ? <div className="recommendation-score-cell"><strong>{numberFormat.format(village.result.score)}</strong><span><i style={{ width: `${Math.max(0, Math.min(100, village.result.score))}%`, background: categoryInfo[village.result.category]?.color }} /></span></div> : "—"}</td>
                      <td title={village.isDemoDemand ? "Kebutuhan belum diisi di Input Data; menggunakan nilai demo." : "Kebutuhan dari catatan input tervalidasi."}>{numberFormat.format(village.demandM3)}{village.isDemoDemand && <small className="recommendation-volume-source">demo</small>}</td>
                      <td>{numberFormat.format(village.allocationM3)}</td>
                      <td>{numberFormat.format(village.allocationShare)}%</td>
                      <td>{village.result ? <span className={`priority-category-badge priority-${village.result.category}`}>{categoryInfo[village.result.category]?.label}</span> : <span className="recommendation-unrated-badge">Belum dianalisis</span>}</td>
                      <td>{village.result ? <button className="priority-detail-button" type="button" onClick={() => setSelectedId(village.result.village_id)}>{selectedResult?.village_id === village.result.village_id ? "Dipilih" : "Lihat peta"}</button> : "—"}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr><th colSpan="3">Total</th><th>{numberFormat.format(totalDemandM3)}</th><th>{numberFormat.format(totalAllocatedM3)}</th><th>{totalAllocatedM3 ? "100%" : "0%"}</th><th>Simulasi</th><th>—</th></tr></tfoot>
                </table>
              </div>
              <p className="recommendation-table-note">Nilai kebutuhan bertanda “demo” dapat diperbarui pada Input Data. Alokasi berubah otomatis ketika nilai kebutuhan atau pasokan simulasi berubah.</p>
            </article>

            <AllocationMap villages={villageRows} supplyM3={demoSupplyM3} selectedId={selectedResult?.village_id} onSelect={setSelectedId} />
          </section>

          <section className="recommendation-insights-grid">
            <article className="recommendation-panel recommendation-chart-panel">
              <PanelHeading title="Ketersediaan vs. Kebutuhan Air" subtitle="Perbandingan persentase dari data tiap desa." />
              <div className="recommendation-bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartResults} margin={{ top: 10, right: 8, bottom: 54, left: -14 }}>
                    <CartesianGrid stroke="#e9eef0" vertical={false} />
                    <XAxis dataKey="village_name" interval={0} angle={-32} textAnchor="end" height={62} tick={{ fontSize: 9, fill: "#66756d" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#66756d" }} />
                    <Tooltip formatter={(value) => [`${numberFormat.format(Number(value))}%`, ""]} />
                    <Legend />
                    <Bar dataKey="demand" name="Kebutuhan" fill="#3987e8" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="availability" name="Ketersediaan" fill="#43ad72" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="recommendation-panel recommendation-distribution-panel">
              <PanelHeading title="Persentase Alokasi per Desa" subtitle={`Distribusi alokasi air dari total ${formatM3(totalAllocatedM3)}.`} />
              <div className="recommendation-donut-layout">
                <div className="recommendation-donut-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={villageRows} dataKey="allocationM3" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
                        {villageRows.map((village) => <Cell key={village.name} fill={village.allocationColor} />)}
                      </Pie>
                      <Tooltip formatter={(value) => [formatM3(Number(value)), "Alokasi"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="recommendation-donut-center"><strong>{formatM3(totalAllocatedM3)}</strong><span>{totalAllocatedM3 ? "100% dialokasikan" : "0% dialokasikan"}</span></div>
                </div>
                <div className="recommendation-category-list">
                  {villageRows.map((village) => <div key={village.name} title={village.name}><i style={{ background: village.allocationColor }} /><span>{village.name === "Karangampel Kidul" ? "K. Kidul" : village.name}</span><strong>{numberFormat.format(village.allocationShare)}%</strong></div>)}
                </div>
              </div>
            </article>

            <article className="recommendation-panel recommendation-scenario-panel">
              <div className="recommendation-scenario-heading">
                <span className="recommendation-scenario-icon"><Droplets size={19} /></span>
                <PanelHeading title="Skenario Ketersediaan Air" subtitle="Lihat dampak perubahan pasokan pada alokasi desa." />
              </div>
              {user?.role === "admin" ? (
                <>
                  <label className="recommendation-scenario-label" htmlFor="recommendation-scenario-scale">
                    <span><strong>Pasokan simulasi</strong><small>Geser atau pilih skenario cepat</small></span>
                    <strong className="recommendation-scenario-value">{formatM3(demoSupplyM3)}</strong>
                  </label>
                  <input
                    id="recommendation-scenario-scale"
                    className="recommendation-scenario-range"
                    type="range"
                    min="2500"
                    max="15000"
                    step="500"
                    value={demoSupplyM3}
                    aria-valuetext={formatM3(demoSupplyM3)}
                    onChange={(event) => setDemoSupplyM3(Number(event.target.value))}
                  />
                  <div className="recommendation-scenario-range-labels"><span>{formatM3(2500)}</span><span>{formatM3(15000)}</span></div>
                  <div className="recommendation-scenario-presets">
                    {scenarioPresets.map(({ percentage, supplyM3 }) => (
                      <button className={demoSupplyM3 === supplyM3 ? "is-active" : ""} type="button" key={percentage} aria-pressed={demoSupplyM3 === supplyM3} onClick={() => setDemoSupplyM3(supplyM3)}>
                        <strong>{percentage}%</strong><span>{formatM3(supplyM3)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="recommendation-scenario-result">
                    <div className="recommendation-scenario-metrics">
                      <div><span>Total kebutuhan</span><strong>{formatM3(totalDemandM3)}</strong></div>
                      <div><span>Total dialokasikan</span><strong>{formatM3(totalAllocatedM3)}</strong></div>
                    </div>
                    <div className="recommendation-scenario-coverage">
                      <div><span>Kebutuhan terpenuhi</span><strong>{numberFormat.format(coveragePercent)}%</strong></div>
                      <div className="recommendation-scenario-track" role="progressbar" aria-label="Persentase kebutuhan air yang terpenuhi" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(100, coveragePercent)}><i style={{ width: `${Math.min(100, coveragePercent)}%` }} /></div>
                    </div>
                    <small>{demoDeficitM3 ? `Defisit simulasi: ${formatM3(demoDeficitM3)}` : `Sisa pasokan tidak dialokasikan: ${formatM3(demoSurplusM3)}`}</small>
                  </div>
                  <p className="recommendation-scenario-note">Alokasi per desa, peta, dan donat diperbarui otomatis. Simulasi tidak mengubah database.</p>
                </>
              ) : (
                <div className="recommendation-scenario-readonly"><ShieldAlert size={16} /><span>Pengaturan skenario hanya tersedia untuk Admin. Angka pasokan yang tampil merupakan simulasi.</span></div>
              )}
            </article>

            <article className="recommendation-panel recommendation-conclusion-panel">
              <PanelHeading title="Kesimpulan & Tindak Lanjut" subtitle="Panduan berdasarkan hasil analisis." />
              <ol className="recommendation-conclusion-list">
                <li>Desa dengan skor tertinggi adalah <strong>{highestPriority.village_name}</strong> ({numberFormat.format(highestPriority.score)}/100).</li>
                <li><strong>{urgentCount} desa</strong> termasuk kategori tinggi atau sangat tinggi.</li>
                {highestPriority.active_rules?.[0]?.text && <li>Faktor yang mendukung: {highestPriority.active_rules[0].text}</li>}
              </ol>
              <div className="recommendation-caveat"><ShieldAlert size={17} /><span>Kebutuhan memakai input tervalidasi jika tersedia; pasokan dan batas peta tetap simulasi.</span></div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

export default Rekomendasi;
