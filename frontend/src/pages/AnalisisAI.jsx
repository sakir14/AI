import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CloudRain,
  Droplets,
  Gauge,
  Lightbulb,
  MapPin,
  Play,
  RefreshCw,
  Sprout,
  Target,
  TriangleAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api";
import useAnalysis from "../hooks/useAnalysis";
import { useAuthUser } from "../auth-context";
import irrigationField from "../assets/irrigation-ricefield.png";

const categoryInfo = {
  rendah: { label: "Rendah", color: "#39a96b" },
  sedang: { label: "Sedang", color: "#f0bd32" },
  tinggi: { label: "Tinggi", color: "#f28b36" },
  sangat_tinggi: { label: "Sangat Tinggi", color: "#e43d48" },
};

const fuzzyInputs = {
  availability: {
    label: "Ketersediaan Air",
    resultKey: "water_availability",
    memberships: "water_availability",
    sets: { rendah: [0, 0, 35, 60], sedang: [35, 60, 85], tinggi: [60, 85, 100, 100] },
  },
  demand: {
    label: "Kebutuhan Air",
    resultKey: "water_demand",
    memberships: "water_demand",
    sets: { rendah: [0, 0, 30, 55], sedang: [30, 55, 80], tinggi: [55, 80, 100, 100] },
  },
};

const prioritySets = {
  rendah: [0, 0, 20, 40],
  sedang: [20, 45, 70],
  tinggi: [50, 70, 90],
  sangat_tinggi: [75, 90, 100, 100],
};

const formatNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

function formatDate(value) {
  if (!value) return "Belum tersedia";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(date);
}

function membership(value, points) {
  const [left, leftTop, rightTop, right] = points.length === 3
    ? [points[0], points[1], points[1], points[2]]
    : points;
  if (value < left || value > right) return 0;
  if (leftTop <= value && value <= rightTop) return 1;
  if (left < value && value < leftTop) return (value - left) / (leftTop - left);
  if (rightTop < value && value < right) return (right - value) / (right - rightTop);
  return 0;
}

function buildMembershipChart(sets) {
  return Array.from({ length: 51 }, (_, index) => index * 2).map((value) => ({
    value,
    ...Object.fromEntries(Object.entries(sets).map(([label, points]) => [label, membership(value, points)])),
  }));
}

function buildOutputChart(activeRules) {
  const strengths = Object.fromEntries(Object.keys(prioritySets).map((label) => [label, 0]));
  activeRules.forEach((rule) => {
    const outputLabel = rule.text
      .split("maka prioritas ")[1]
      ?.replace(/[.]$/, "")
      .trim()
      .replace(/\s+/g, "_");
    if (outputLabel && Object.hasOwn(strengths, outputLabel)) {
      strengths[outputLabel] = Math.max(strengths[outputLabel], rule.activation);
    }
  });

  return Array.from({ length: 101 }, (_, value) => {
    const outputMemberships = Object.fromEntries(Object.entries(prioritySets).map(([label, points]) => [
      label,
      Math.min(strengths[label], membership(value, points)),
    ]));
    return { value, ...outputMemberships, membership: Math.max(...Object.values(outputMemberships)) };
  });
}

function dominantTerm(terms) {
  return Object.entries(terms || {}).sort((first, second) => second[1] - first[1])[0];
}

function SectionHeading({ icon: Icon, title, subtitle, tone = "green", trailing }) {
  return (
    <div className="analysis-section-heading">
      <span className={`analysis-section-icon ${tone}`}><Icon size={17} /></span>
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {trailing}
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, tone = "green" }) {
  return (
    <div className="analysis-metric-row">
      <span className={`analysis-metric-icon ${tone}`}><Icon size={15} /></span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MembershipChart({ title, subtitle, inputValue, sets, compact = false }) {
  const data = useMemo(() => buildMembershipChart(sets), [sets]);
  return (
    <section className={`analysis-card analysis-membership-card${compact ? " is-compact" : ""}`}>
      <SectionHeading icon={Activity} title={title} subtitle={subtitle} tone="purple" />
      <div className="analysis-chart-legend">
        <span><i className="low" />Rendah</span>
        <span><i className="medium" />Sedang</span>
        <span><i className="high" />Tinggi</span>
      </div>
      <div className="analysis-membership-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 5, left: -18 }}>
            <CartesianGrid stroke="#e9efec" vertical={false} />
            <XAxis dataKey="value" type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fontSize: 10, fill: "#738078" }} />
            <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tick={{ fontSize: 10, fill: "#738078" }} />
            <Tooltip formatter={(value) => [Number(value).toFixed(2), "Derajat keanggotaan"]} labelFormatter={(value) => `Nilai input: ${value}%`} />
            <ReferenceLine x={inputValue} stroke="#344054" strokeDasharray="4 4" />
            <Line name="Rendah" dataKey="rendah" stroke="#e54b52" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line name="Sedang" dataKey="sedang" stroke="#efbb2f" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line name="Tinggi" dataKey="tinggi" stroke="#178459" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="analysis-axis-label">{title} (%) · garis putus-putus menunjukkan nilai desa</div>
    </section>
  );
}

function SingleVillageAnalysis({ result, village, userRole, onRun, running, loading, membershipVariable, onMembershipVariableChange }) {
  const availability = result.inputs.water_availability;
  const demand = result.inputs.water_demand;
  const selectedFuzzyInput = fuzzyInputs[membershipVariable];
  const selectedFuzzyValue = result.inputs[selectedFuzzyInput.resultKey];
  const selectedMemberships = result.input_membership[selectedFuzzyInput.memberships];
  const outputChart = useMemo(() => buildOutputChart(result.active_rules), [result.active_rules]);
  const outputDegrees = useMemo(() => Object.fromEntries(Object.keys(prioritySets).map((label) => [
    label,
    Math.max(...outputChart.map((point) => point[label]), 0),
  ])), [outputChart]);
  const availabilityDominant = dominantTerm(result.input_membership.water_availability);
  const demandDominant = dominantTerm(result.input_membership.water_demand);
  const villageArea = village?.area_hectare;

  return (
    <>
      <div className="analysis-single-grid">
        <section className="analysis-card analysis-parameter-card">
          <SectionHeading icon={ClipboardList} title="Pilih Desa dan Parameter" subtitle="Data catatan tervalidasi terbaru." />
          <label className="analysis-village-select">
            <span>Pilih Desa</span>
            <select value={result.village_id} onChange={onMembershipVariableChange.selectVillage}>
              {onMembershipVariableChange.villages.map((item) => (
                <option key={item.village_id} value={item.village_id}>{item.village_name}</option>
              ))}
            </select>
          </label>
          <div className="analysis-readonly-fields">
            <MetricRow icon={Sprout} label="Luas Sawah" value={villageArea == null ? "Belum diisi" : `${formatNumber.format(villageArea)} ha`} />
            <MetricRow icon={Droplets} label="Ketersediaan Air" value={`${formatNumber.format(availability)}%`} tone="blue" />
            <MetricRow icon={Target} label="Kebutuhan Air" value={`${formatNumber.format(demand)}%`} tone="amber" />
            <MetricRow icon={CalendarDays} label="Umur Tanaman" value={`${result.inputs.plant_age} hari`} tone="purple" />
            <MetricRow icon={TriangleAlert} label="Kondisi Saluran" value={result.inputs.canal_condition} tone="red" />
            <MetricRow icon={CloudRain} label="Curah Hujan" value={result.inputs.rainfall == null ? "Tidak dicatat" : `${formatNumber.format(result.inputs.rainfall)} mm`} tone="blue" />
          </div>
          {userRole === "admin" && (
            <button className="analysis-run-button" type="button" onClick={onRun} disabled={running || loading}>
              {running ? <RefreshCw className="is-spinning" size={17} /> : <Play size={17} fill="currentColor" />}
              {running ? "Memproses analisis..." : "Proses Analisis AI"}
            </button>
          )}
          <p className="analysis-readonly-note">Parameter diambil dari catatan terbaru. Ubah data melalui menu Input Data.</p>
        </section>

        <section className="analysis-card analysis-result-card">
          <SectionHeading icon={Gauge} title="Hasil Analisis AI" subtitle={`Catatan ${formatDate(result.recorded_at)}`} trailing={<span className="analysis-village-tag">{result.village_name}</span>} tone="purple" />
          <div className={`analysis-score-hero priority-${result.category}`}>
            <div className="analysis-score-copy">
              <span>Skor Prioritas</span>
              <strong>{formatNumber.format(result.score)}<small> / 100</small></strong>
              <span className={`analysis-priority-badge priority-${result.category}`}><Target size={19} />{categoryInfo[result.category]?.label || result.category}</span>
            </div>
            <div className="analysis-field-image" style={{ backgroundImage: `linear-gradient(0deg, rgb(12 38 29 / 18%), transparent 60%), url(${irrigationField})` }} role="img" aria-label="Ilustrasi sawah dan saluran irigasi" />
          </div>
          <div className="analysis-summary-list">
            <h3>Ringkasan Input</h3>
            <MetricRow icon={Sprout} label="Luas sawah" value={villageArea == null ? "Belum diisi" : `${formatNumber.format(villageArea)} ha`} />
            <MetricRow icon={Droplets} label="Ketersediaan air" value={`${formatNumber.format(availability)}%`} tone="blue" />
            <MetricRow icon={Target} label="Kebutuhan air" value={`${formatNumber.format(demand)}%`} tone="amber" />
            <MetricRow icon={CalendarDays} label="Umur tanaman" value={`${result.inputs.plant_age} hari`} tone="purple" />
            <MetricRow icon={TriangleAlert} label="Kondisi saluran" value={result.inputs.canal_condition} tone="red" />
            <MetricRow icon={CloudRain} label="Curah hujan" value={result.inputs.rainfall == null ? "Tidak dicatat" : `${formatNumber.format(result.inputs.rainfall)} mm`} tone="blue" />
          </div>
        </section>

        <div className="analysis-membership-column">
          <MembershipChart
            title="Fungsi Keanggotaan Fuzzy"
            subtitle="Garis putus-putus menandai nilai input desa."
            inputValue={selectedFuzzyValue}
            sets={selectedFuzzyInput.sets}
          />
          <section className="analysis-card analysis-degree-card">
            <SectionHeading
              icon={Activity}
              title="Derajat Keanggotaan Input"
              subtitle="Nilai fuzzifikasi pada kondisi terpilih."
              tone="blue"
              trailing={(
                <select aria-label="Variabel Fuzzy" value={membershipVariable} onChange={(event) => onMembershipVariableChange.setVariable(event.target.value)}>
                  <option value="availability">Ketersediaan Air</option>
                  <option value="demand">Kebutuhan Air</option>
                </select>
              )}
            />
            <div className="analysis-degree-list">
              {Object.entries(selectedMemberships).map(([label, value]) => (
                <div className="analysis-degree-row" key={label}>
                  <span>{label}</span><div><i style={{ width: `${value * 100}%` }} /></div><strong>{value.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <p className="analysis-model-note">Model Fuzzy saat ini menggunakan ketersediaan dan kebutuhan air. Umur, luas, saluran, dan hujan ditampilkan sebagai konteks.</p>
          </section>
        </div>
      </div>

      <div className="analysis-lower-grid">
        <section className="analysis-card analysis-rules-card">
          <SectionHeading icon={ClipboardList} title="Rule Fuzzy yang Aktif" subtitle="Aturan dengan nilai aktivasi bukan nol." tone="purple" />
          {!result.active_rules.length ? <p className="analysis-no-rules">Tidak ada aturan aktif untuk kombinasi input ini.</p> : (
            <div className="analysis-rules-scroll">
              <table className="analysis-rules-table">
                <thead><tr><th>No</th><th>Aturan (Rule)</th><th>Konsekuen</th><th>Aktivasi (α)</th></tr></thead>
                <tbody>
                  {result.active_rules.map((rule, index) => (
                    <tr key={`${rule.text}-${index}`}>
                      <td>{index + 1}</td><td>{rule.text}</td>
                      <td>{rule.text.split("maka prioritas ")[1]?.replace(/[.]$/, "") || "—"}</td>
                      <td><strong>{rule.activation.toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="analysis-card analysis-defuzz-card">
          <SectionHeading icon={Gauge} title="Proses Defuzzifikasi" subtitle="Agregasi keluaran dan titik centroid." tone="purple" />
          <div className="analysis-defuzz-legend">
            <span><i className="analysis-defuzz-aggregate-key" />μ agregat (kurva hijau)</span>
            <span><i className="analysis-defuzz-centroid-key" />Centroid / skor akhir (garis merah)</span>
          </div>
          <div className="analysis-defuzz-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={outputChart} margin={{ top: 10, right: 10, bottom: 5, left: -18 }}>
                <CartesianGrid stroke="#e9efec" vertical={false} />
                <XAxis dataKey="value" type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fontSize: 10, fill: "#738078" }} />
                <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tick={{ fontSize: 10, fill: "#738078" }} />
                <Tooltip formatter={(value) => [Number(value).toFixed(2), "Derajat agregasi (μ)"]} labelFormatter={(value) => `Nilai keluaran (sumbu X): ${value}`} />
                <Area type="monotone" dataKey="membership" stroke="#178459" strokeWidth={2} fill="#8bd5a8" fillOpacity={0.46} isAnimationActive={false} />
                <ReferenceLine x={result.score} stroke="#e43d48" strokeWidth={2} label={{ value: `Centroid ${formatNumber.format(result.score)}`, position: "insideTopRight", fill: "#c73742", fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="analysis-centroid-value"><span>Metode centroid</span><strong>{formatNumber.format(result.score)} / 100</strong></div>
          <div className="sr-only">Derajat keluaran: {Object.entries(outputDegrees).map(([label, value]) => `${label} ${value.toFixed(2)}`).join(", ")}</div>
        </section>

        <section className="analysis-card analysis-reasons-card">
          <SectionHeading icon={Lightbulb} title="Alasan Keputusan AI" subtitle="Faktor Fuzzy paling berpengaruh." tone="amber" />
          <ol>
            <li>Ketersediaan air dominan pada kategori {availabilityDominant?.[0] || "—"} (μ {availabilityDominant?.[1]?.toFixed(2) || "0.00"}).</li>
            <li>Kebutuhan air dominan pada kategori {demandDominant?.[0] || "—"} (μ {demandDominant?.[1]?.toFixed(2) || "0.00"}).</li>
            <li>Skor akhir {formatNumber.format(result.score)} masuk prioritas {categoryInfo[result.category]?.label || result.category}.</li>
          </ol>
          <div className="analysis-recommendation">
            <CheckCircle2 size={19} />
            <div><strong>Rekomendasi Tindakan</strong><p>Jadikan Desa {result.village_name} sebagai salah satu sasaran tindak lanjut dan verifikasi kondisi lapangan. Hasil ini menunjukkan urutan prioritas, bukan volume pembagian air.</p></div>
          </div>
        </section>
      </div>
    </>
  );
}

function ComparisonView({ results }) {
  const chartResults = [...results].sort((first, second) => second.score - first.score);
  return (
    <div className="analysis-tab-content">
      <section className="analysis-card analysis-comparison-chart-card">
        <SectionHeading icon={BarChart3} title="Perbandingan Skor Prioritas Desa" subtitle="Skor Fuzzy dihitung dari catatan tervalidasi terbaru tiap desa." />
        <div className="analysis-comparison-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartResults} margin={{ top: 22, right: 14, bottom: 58, left: 0 }}>
              <CartesianGrid stroke="#e9efec" vertical={false} />
              <XAxis dataKey="village_name" interval={0} angle={-28} textAnchor="end" height={68} tick={{ fontSize: 10, fill: "#66736d" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#66736d" }} />
              <Tooltip formatter={(value) => [`${formatNumber.format(Number(value))} / 100`, "Skor prioritas"]} />
              <Bar dataKey="score" name="Skor prioritas" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartResults.map((item) => <Cell key={item.village_id} fill={categoryInfo[item.category]?.color || "#178459"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="analysis-card analysis-comparison-table-card">
        <SectionHeading icon={ClipboardList} title="Urutan Prioritas Desa" subtitle={`${results.length} desa memiliki catatan tervalidasi.`} />
        <div className="analysis-rules-scroll"><table className="analysis-rules-table analysis-ranking-table">
          <thead><tr><th>Rank</th><th>Desa</th><th>Skor</th><th>Status Prioritas</th><th>Ketersediaan</th><th>Kebutuhan</th><th>Tanggal Catatan</th></tr></thead>
          <tbody>{results.map((result) => <tr key={result.village_id}><td>{result.rank}</td><td>{result.village_name}</td><td><strong>{formatNumber.format(result.score)}</strong></td><td><span className={`analysis-priority-pill priority-${result.category}`}>{categoryInfo[result.category]?.label}</span></td><td>{formatNumber.format(result.inputs.water_availability)}%</td><td>{formatNumber.format(result.inputs.water_demand)}%</td><td>{formatDate(result.recorded_at)}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}

function ScenarioView({ baseResults, simulationResult, scale, onScaleChange, onRun, running }) {
  const comparison = simulationResult?.results || [];
  const baselineById = new Map(baseResults.map((result) => [result.village_id, result]));
  return (
    <div className="analysis-tab-content">
      <section className="analysis-card analysis-scenario-card">
        <SectionHeading icon={Activity} title="Simulasi Ketersediaan Air" subtitle="Uji skenario tanpa mengubah data yang sudah disimpan." tone="blue" />
        <div className="analysis-scenario-control">
          <label htmlFor="analysis-scenario-scale">Faktor ketersediaan air <strong>{scale}%</strong></label>
          <input id="analysis-scenario-scale" type="range" min="0" max="100" step="5" value={scale} onChange={(event) => onScaleChange(Number(event.target.value))} />
          <div className="analysis-scenario-scale-labels"><span>0% (kering)</span><span>100% (kondisi saat ini)</span></div>
          <p>Faktor ini mengubah nilai ketersediaan air untuk simulasi model. Ini bukan pengukuran debit atau prediksi volume distribusi.</p>
          <button className="analysis-run-button" type="button" onClick={onRun} disabled={running}><Play size={16} fill="currentColor" />{running ? "Menghitung skenario..." : "Hitung Skenario"}</button>
        </div>
      </section>
      {simulationResult && (
        <section className="analysis-card analysis-comparison-table-card">
          <SectionHeading icon={BarChart3} title="Perbandingan Hasil Skenario" subtitle="Urutan dan skor setelah penyesuaian ketersediaan air." />
          <div className="analysis-rules-scroll"><table className="analysis-rules-table analysis-ranking-table">
            <thead><tr><th>Desa</th><th>Skor Saat Ini</th><th>Skor Skenario</th><th>Kategori Skenario</th><th>Air Skenario</th></tr></thead>
            <tbody>{comparison.map((result) => <tr key={result.village_id}><td>{result.village_name}</td><td>{formatNumber.format(baselineById.get(result.village_id)?.score ?? 0)}</td><td><strong>{formatNumber.format(result.score)}</strong></td><td><span className={`analysis-priority-pill priority-${result.category}`}>{categoryInfo[result.category]?.label}</span></td><td>{formatNumber.format(result.inputs.water_availability)}%</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}

function EvaluationView({ results, analysis }) {
  const categoryCounts = results.reduce((counts, result) => {
    counts[result.category] = (counts[result.category] || 0) + 1;
    return counts;
  }, {});
  const averageScore = results.length ? results.reduce((total, result) => total + result.score, 0) / results.length : 0;
  return (
    <div className="analysis-tab-content">
      <div className="analysis-evaluation-stats">
        <article><span>Desa dianalisis</span><strong>{results.length}</strong><small>Dengan catatan tervalidasi</small></article>
        <article><span>Rata-rata skor</span><strong>{formatNumber.format(averageScore)}</strong><small>Skala prioritas 0–100</small></article>
        <article><span>Prioritas sangat tinggi</span><strong>{categoryCounts.sangat_tinggi || 0}</strong><small>Dari {results.length} desa</small></article>
        <article><span>Analisis terakhir</span><strong className="analysis-evaluation-date">{analysis.generated_at ? formatDate(analysis.generated_at) : "Belum diterbitkan"}</strong><small>{analysis.generated_at ? new Date(analysis.generated_at).toLocaleTimeString("id-ID") : "Hasil langsung dari data"}</small></article>
      </div>
      <section className="analysis-card analysis-evaluation-card">
        <SectionHeading icon={CheckCircle2} title="Evaluasi Keluaran Model" subtitle="Pemeriksaan konsistensi keluaran Fuzzy dari data yang dianalisis." tone="green" />
        <div className="analysis-category-counts">{Object.entries(categoryInfo).map(([category, info]) => <div key={category}><i style={{ background: info.color }} /><span>{info.label}</span><strong>{categoryCounts[category] || 0} desa</strong></div>)}</div>
        <div className="analysis-evaluation-note"><Lightbulb size={19} /><p>Ringkasan ini mengevaluasi keluaran dan sebaran kategori model. Akurasi terhadap kondisi lapangan belum dapat dinilai tanpa data pembanding atau verifikasi pakar.</p></div>
      </section>
      <section className="analysis-card analysis-comparison-table-card">
        <SectionHeading icon={ClipboardList} title="Data yang Digunakan" subtitle="Satu catatan tervalidasi terbaru per desa." />
        <div className="analysis-rules-scroll"><table className="analysis-rules-table analysis-ranking-table">
          <thead><tr><th>Desa</th><th>Tanggal</th><th>Umur Tanaman</th><th>Kondisi Saluran</th><th>Skor</th><th>Kategori</th></tr></thead>
          <tbody>{results.map((result) => <tr key={result.village_id}><td>{result.village_name}</td><td>{formatDate(result.recorded_at)}</td><td>{result.inputs.plant_age} hari</td><td>{result.inputs.canal_condition}</td><td><strong>{formatNumber.format(result.score)}</strong></td><td>{categoryInfo[result.category]?.label}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}

function AnalisisAI() {
  const user = useAuthUser();
  const { analysis, loading, error, refresh } = useAnalysis();
  const [today] = useState(() => new Date());
  const [villages, setVillages] = useState([]);
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [activeTab, setActiveTab] = useState("single");
  const [membershipVariable, setMembershipVariable] = useState("availability");
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState(null);
  const [scenarioScale, setScenarioScale] = useState(100);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const results = analysis?.results || [];
  const selectedResult = results.find((result) => String(result.village_id) === selectedVillageId) || results[0];
  const selectedVillage = villages.find((village) => village.id === selectedResult?.village_id);

  useEffect(() => {
    let active = true;
    api.get("/api/villages/")
      .then(({ data }) => { if (active) setVillages(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const runAnalysis = async () => {
    setRunning(true);
    setRunMessage(null);
    try {
      const response = await api.post("/api/analysis/run");
      await refresh();
      setRunMessage({
        type: "success",
        text: response.data.results.length
          ? "Analisis selesai dan hasil terbaru diterbitkan untuk Petugas."
          : "Analisis selesai, tetapi belum ada catatan tervalidasi untuk dihitung.",
      });
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setRunMessage({ type: "error", text: typeof detail === "string" ? detail : "Analisis gagal dijalankan." });
    } finally {
      setRunning(false);
    }
  };

  const runScenario = async () => {
    setScenarioRunning(true);
    setScenarioResult(null);
    try {
      const response = await api.post("/api/analysis/simulate", { availability_scale: scenarioScale / 100 });
      setScenarioResult(response.data);
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setRunMessage({ type: "error", text: typeof detail === "string" ? detail : "Simulasi gagal dihitung." });
    } finally {
      setScenarioRunning(false);
    }
  };

  const tabs = [
    { id: "single", label: "Analisis Satu Desa", icon: Target },
    { id: "compare", label: "Analisis Perbandingan Desa", icon: BarChart3 },
    ...(user.role === "admin" ? [{ id: "scenario", label: "Simulasi Skenario", icon: Activity }] : []),
    { id: "evaluation", label: "Evaluasi Hasil", icon: CheckCircle2 },
  ];
  const selectedResultProps = {
    selectVillage: (event) => setSelectedVillageId(event.target.value),
    villages: results,
    setVariable: setMembershipVariable,
  };

  return (
    <div className="analysis-ai-page">
      <header className="analysis-page-heading">
        <div>
          <h1>Analisis AI</h1>
          <p>Analisis Fuzzy Logic untuk membantu menentukan prioritas distribusi air irigasi.</p>
        </div>
        <div className="analysis-page-meta">
          <span className="analysis-date-icon"><CalendarDays size={20} /></span>
          <span><strong>{new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(today)}</strong><small>Kecamatan Karangampel, Indramayu</small></span>
          <span className="analysis-season-pill">Musim Tanam: {selectedResult?.inputs.planting_season || "—"}</span>
        </div>
      </header>

      {user.role !== "admin" && <div className="analysis-info-banner">Anda melihat hasil yang sudah diterbitkan Admin untuk desa tugas Anda. Model menggunakan data tervalidasi terbaru.</div>}
      {runMessage && <p className={`${runMessage.type === "success" ? "success-message" : "error-message"} form-message`} role={runMessage.type === "error" ? "alert" : "status"}>{runMessage.text}</p>}
      {error && <p className="error-message form-message" role="alert">{error}</p>}

      <nav className="analysis-tabs" aria-label="Tampilan analisis AI">
        {tabs.map(({ id, label, icon: Icon }) => <button className={activeTab === id ? "is-active" : ""} key={id} type="button" onClick={() => setActiveTab(id)}><Icon size={16} />{label}</button>)}
      </nav>

      {loading ? <p className="analysis-loading">Memuat data analisis...</p> : !results.length ? (
        <div className="analysis-empty-state">
          <span><BarChart3 size={27} /></span>
          <h2>Belum ada hasil analisis</h2>
          <p>{user.role === "admin" ? "Masukkan catatan irigasi, pastikan data tervalidasi, lalu proses analisis AI." : "Admin belum menerbitkan hasil atau belum ada catatan tervalidasi untuk desa tugas Anda."}</p>
          {user.role === "admin" && <button className="analysis-run-button" type="button" onClick={runAnalysis} disabled={running}><Play size={16} fill="currentColor" />{running ? "Menjalankan analisis..." : "Jalankan Analisis AI"}</button>}
        </div>
      ) : (
        <>
          {analysis.notice && analysis.generated_at == null && <div className="analysis-info-banner">{analysis.notice}</div>}
          {activeTab === "single" && selectedResult && (
            <SingleVillageAnalysis
              result={selectedResult}
              village={selectedVillage}
              userRole={user.role}
              onRun={runAnalysis}
              running={running}
              loading={loading}
              membershipVariable={membershipVariable}
              onMembershipVariableChange={selectedResultProps}
            />
          )}
          {activeTab === "compare" && <ComparisonView results={results} />}
          {activeTab === "scenario" && user.role === "admin" && <ScenarioView baseResults={results} simulationResult={scenarioResult} scale={scenarioScale} onScaleChange={setScenarioScale} onRun={runScenario} running={scenarioRunning} />}
          {activeTab === "evaluation" && <EvaluationView results={results} analysis={analysis} />}
          <p className="analysis-disclaimer"><MapPin size={15} /> Skor menunjukkan urgensi relatif, bukan volume alokasi. Jaringan rute A* adalah simulasi abstrak dan bukan peta saluran terverifikasi.</p>
        </>
      )}
    </div>
  );
}

export default AnalisisAI;
