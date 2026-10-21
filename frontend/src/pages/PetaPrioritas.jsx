import { useMemo, useState } from "react";
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
import { Activity, BarChart3, CalendarDays, Download, Droplets, Map as MapIcon, MapPin, Target } from "lucide-react";
import useAnalysis from "../hooks/useAnalysis";

const categoryInfo = {
  sangat_tinggi: { label: "Sangat Tinggi", color: "#e9434e" },
  tinggi: { label: "Tinggi", color: "#f5823b" },
  sedang: { label: "Sedang", color: "#f5c746" },
  rendah: { label: "Rendah", color: "#42b96b" },
};

const categoryOrder = ["sangat_tinggi", "tinggi", "sedang", "rendah"];
const emptyResults = [];
const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

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

const sourceNode = "Sumber air (simulasi)";
const branchNodeNames = {
  A: "Cabang A (simulasi)",
  B: "Cabang B (simulasi)",
  C: "Cabang C (simulasi)",
};
const routePositions = {
  [sourceNode]: { x: 75, y: 240 },
  ...Object.fromEntries(Object.entries(branchNodeNames).map(([key, name]) => [name, branchPositions[key]])),
  ...networkPositions,
};
const networkEdges = [
  [sourceNode, branchNodeNames.A],
  [sourceNode, branchNodeNames.B],
  [sourceNode, branchNodeNames.C],
  [branchNodeNames.A, branchNodeNames.B],
  [branchNodeNames.B, branchNodeNames.C],
  ...Object.entries(networkPositions).map(([name, position]) => [branchNodeNames[position.branch], name]),
];

function SummaryCard({ icon: Icon, tone, title, value, detail }) {
  return (
    <article className="priority-summary-card">
      <span className={`priority-summary-icon ${tone}`}><Icon size={23} /></span>
      <div><span>{title}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

function PanelHeading({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="priority-panel-heading">
      <span><Icon size={17} /></span>
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action}
    </div>
  );
}

function PriorityNetwork({ results, selectedId, onSelect }) {
  const resultByName = new Map(results.map((result) => [result.village_name, result]));
  const selected = results.find((result) => result.village_id === selectedId);
  const routeResult = results[0];
  const routePath = routeResult?.astar_route?.path || [];

  return (
    <div className="priority-map-canvas">
      <div className="priority-map-scroll-hint">
        <span>Rute A* berwarna biru menuju {routeResult?.village_name} (prioritas tertinggi)</span>
        <span>Geser diagram untuk melihat seluruh desa</span>
      </div>
      <div className="priority-map-scroll" role="region" aria-label="Diagram jaringan desa, geser horizontal untuk melihat seluruh desa" tabIndex={0}>
        <svg className="priority-network-svg" viewBox="0 0 900 480" role="img" aria-label="Skema jaringan irigasi abstrak dengan warna kategori prioritas desa">
        <defs>
          <linearGradient id="priority-waterline" x1="0" x2="1"><stop offset="0%" stopColor="#55b8aa" /><stop offset="100%" stopColor="#218d83" /></linearGradient>
          <marker id="priority-route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1769c2" />
          </marker>
        </defs>
        {networkEdges.map(([from, to]) => {
          const start = routePositions[from];
          const end = routePositions[to];
          return <line className="priority-network-link" key={`network-edge-${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
        })}
        {routePath.slice(1).map((to, index) => {
          const from = routePath[index];
          const start = routePositions[from];
          const end = routePositions[to];
          if (!start || !end) return null;
          const deltaX = end.x - start.x;
          const deltaY = end.y - start.y;
          const distance = Math.hypot(deltaX, deltaY) || 1;
          return <line className="priority-network-link-active" key={`route-edge-${from}-${to}`} x1={start.x} y1={start.y} x2={end.x - deltaX / distance * 22} y2={end.y - deltaY / distance * 22} markerEnd="url(#priority-route-arrow)" />;
        })}
        <g className="priority-network-source">
          <circle cx="75" cy="240" r="23" />
          <path d="M75 226c-7 10-10 14-10 19a10 10 0 0 0 20 0c0-5-3-9-10-19Z" />
          <text x="75" y="280" textAnchor="middle">Sumber air</text>
          <text className="priority-network-subtext" x="75" y="296" textAnchor="middle">simulasi</text>
        </g>
        {Object.entries(branchPositions).map(([key, branch]) => (
          <g className="priority-network-branch" key={`branch-${key}`}>
            <circle cx={branch.x} cy={branch.y} r="9" />
            <text x={branch.x} y={branch.y - 16} textAnchor="middle">{branch.label}</text>
          </g>
        ))}
        {Object.entries(networkPositions).map(([name, position]) => {
          const result = resultByName.get(name);
          const category = categoryInfo[result?.category];
          const isSelected = result?.village_id === selectedId;
          const isRouteTarget = name === routeResult?.village_name;
          return (
            <g
              className={`priority-network-village${isSelected ? " is-selected" : ""}${isRouteTarget ? " is-route-target" : ""}${result ? " has-result" : " is-unrated"}`}
              key={`node-${name}`}
              role="button"
              tabIndex={0}
              aria-label={`${name}: ${category?.label || "Belum dianalisis"}${result ? `, skor ${numberFormat.format(result.score)}` : ""}`}
              onClick={() => result && onSelect(result.village_id)}
              onKeyDown={(event) => {
                if (result && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelect(result.village_id);
                }
              }}
            >
              {isRouteTarget && <circle className="priority-network-target" cx={position.x} cy={position.y} r="20" />}
              {isSelected && <circle className="priority-network-focus" cx={position.x} cy={position.y} r="17" />}
              <circle className="priority-network-dot" cx={position.x} cy={position.y} r="11" fill={category?.color || "#9ca9a3"} />
              <text
                x={position.x >= 745 ? position.x - 15 : position.x + 15}
                y={position.y + 4}
                textAnchor={position.x >= 745 ? "end" : "start"}
              >{name}</text>
            </g>
          );
        })}
        </svg>
      </div>
      {selected && (
        <div className="priority-map-selection">
          <div><span>Desa terpilih</span><strong>{selected.village_name}</strong></div>
          <span className={`priority-category-badge priority-${selected.category}`}>{categoryInfo[selected.category]?.label}</span>
          <span>Skor {numberFormat.format(selected.score)}</span>
          {routePath.length > 0 && <small>Jalur yang disorot: {routePath.join(" → ")}{routeResult.astar_route.cost_units != null ? ` · biaya ${routeResult.astar_route.cost_units} unit` : ""}</small>}
        </div>
      )}
      <div className="priority-map-legend">
        {categoryOrder.map((key) => <span key={key}><i style={{ background: categoryInfo[key].color }} />{categoryInfo[key].label}</span>)}
        <span><i className="priority-route-legend" />Jalur A*</span>
        <span><i className="is-unrated" />Belum dianalisis</span>
      </div>
      <p className="priority-map-disclaimer">Skema jaringan abstrak untuk visualisasi ranking; bukan peta geografis, batas desa, atau jaringan saluran terverifikasi.</p>
    </div>
  );
}

function PetaPrioritas() {
  const { analysis, loading, error } = useAnalysis();
  const [today] = useState(() => new Date());
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const allResults = analysis?.results || emptyResults;
  const seasons = useMemo(() => [...new Set(allResults.map((result) => result.inputs.planting_season).filter(Boolean))].sort(), [allResults]);
  const results = useMemo(() => {
    const filtered = allResults.filter((result) => seasonFilter === "all" || result.inputs.planting_season === seasonFilter);
    return [...filtered].sort((first, second) => second.score - first.score || first.village_name.localeCompare(second.village_name));
  }, [allResults, seasonFilter]);
  const selectedResult = results.find((result) => result.village_id === selectedId) || results[0];
  const averages = results.reduce((summary, result) => ({
    availability: summary.availability + result.inputs.water_availability,
    demand: summary.demand + result.inputs.water_demand,
  }), { availability: 0, demand: 0 });
  const averageAvailability = results.length ? averages.availability / results.length : 0;
  const averageDemand = results.length ? averages.demand / results.length : 0;
  const highPriorityCount = results.filter((result) => ["tinggi", "sangat_tinggi"].includes(result.category)).length;
  const categoryData = categoryOrder.map((key) => {
    const categorizedResults = results.filter((result) => result.category === key);
    const scoreTotal = categorizedResults.reduce((total, result) => total + result.score, 0);
    return {
      key,
      name: categoryInfo[key].label,
      color: categoryInfo[key].color,
      count: categorizedResults.length,
      share: results.length ? categorizedResults.length / results.length * 100 : 0,
      averageScore: categorizedResults.length ? scoreTotal / categorizedResults.length : 0,
    };
  });

  const exportCsv = () => {
    const rows = [
      ["Peringkat", "Nama Desa", "Skor Prioritas", "Kategori", "Ketersediaan Air (%)", "Kebutuhan Air (%)", "Umur Tanaman (hari)", "Kondisi Saluran", "Musim Tanam", "Tanggal Catatan"],
      ...results.map((result, index) => [
        index + 1,
        result.village_name,
        result.score,
        categoryInfo[result.category]?.label || result.category,
        result.inputs.water_availability,
        result.inputs.water_demand,
        result.inputs.plant_age,
        result.inputs.canal_condition,
        result.inputs.planting_season,
        result.recorded_at,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const downloadUrl = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "ranking-prioritas-desa.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  return (
    <div className="priority-page">
      <header className="priority-page-header">
        <div><h1>Peta &amp; Ranking Prioritas Desa</h1><p>Visualisasi tingkat prioritas distribusi air berdasarkan hasil analisis AI.</p></div>
        <div className="priority-page-controls">
          <span className="priority-page-date"><CalendarDays size={17} />{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(today)}</span>
          <label>Musim Tanam
            <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>
              <option value="all">Semua musim</option>
              {seasons.map((season) => <option value={season} key={season}>{season}</option>)}
            </select>
          </label>
        </div>
      </header>

      {error && <p className="error-message form-message" role="alert">{error}</p>}
      {loading ? <p className="priority-loading">Memuat ranking prioritas...</p> : !results.length ? (
        <div className="priority-empty-state"><span><MapIcon size={25} /></span><h2>Belum ada hasil prioritas</h2><p>Pastikan ada catatan irigasi tervalidasi dan analisis AI sudah tersedia.</p></div>
      ) : (
        <>
          <section className="priority-summary-grid" aria-label="Ringkasan prioritas desa">
            <SummaryCard icon={MapPin} tone="green" title="Desa Dianalisis" value={`${results.length} desa`} detail="Memiliki catatan tervalidasi" />
            <SummaryCard icon={Droplets} tone="blue" title="Rata-rata Ketersediaan" value={`${numberFormat.format(averageAvailability)}%`} detail="Berdasarkan desa yang ditampilkan" />
            <SummaryCard icon={Activity} tone="red" title="Rata-rata Kebutuhan" value={`${numberFormat.format(averageDemand)}%`} detail="Berdasarkan catatan terbaru" />
            <SummaryCard icon={Target} tone="amber" title="Prioritas Tinggi" value={`${highPriorityCount} desa`} detail="Kategori tinggi dan sangat tinggi" />
          </section>

          <section className="priority-main-grid">
            <article className="priority-panel priority-ranking-panel">
              <PanelHeading
                icon={Target}
                title="Ranking Prioritas Desa"
                subtitle="Urutan berdasarkan skor Fuzzy Logic dari data terbaru."
                action={<button className="priority-export-button" type="button" onClick={exportCsv} disabled={!results.length}><Download size={15} />Export CSV</button>}
              />
              <div className="priority-table-wrap"><table className="priority-table">
                <thead><tr><th>No</th><th>Nama Desa</th><th>Skor Prioritas</th><th>Kategori</th><th>Air tersedia / kebutuhan</th><th>Aksi</th></tr></thead>
                <tbody>{results.map((result, index) => (
                  <tr className={selectedResult?.village_id === result.village_id ? "is-selected" : ""} key={result.village_id}>
                    <td>{index + 1}</td>
                    <td><strong>{result.village_name}</strong></td>
                    <td><div className="priority-score-cell"><strong>{numberFormat.format(result.score)}</strong><span><i style={{ width: `${Math.max(0, Math.min(100, result.score))}%`, background: categoryInfo[result.category]?.color }} /></span></div></td>
                    <td><span className={`priority-category-badge priority-${result.category}`}>{categoryInfo[result.category]?.label}</span></td>
                    <td>{numberFormat.format(result.inputs.water_availability)}% / {numberFormat.format(result.inputs.water_demand)}%</td>
                    <td><button className="priority-detail-button" type="button" onClick={() => setSelectedId(result.village_id)}>Detail</button></td>
                  </tr>
                ))}</tbody>
              </table></div>
              <div className="priority-table-footer">Menampilkan {results.length} desa dengan data analisis pada musim terpilih.</div>
            </article>

            <article className="priority-panel priority-map-panel">
              <PanelHeading icon={MapIcon} title="Peta Prioritas Desa" subtitle="Jalur A* dari sumber air menuju desa dengan skor prioritas tertinggi." />
              <PriorityNetwork results={results} selectedId={selectedResult?.village_id} onSelect={setSelectedId} />
            </article>
          </section>

          <section className="priority-insights-grid">
            <article className="priority-panel priority-score-chart-panel">
              <PanelHeading icon={BarChart3} title="Grafik Perbandingan Skor Prioritas" subtitle="Skor Fuzzy Logic pada skala 0–100." />
              <div className="priority-score-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results} margin={{ top: 20, right: 10, bottom: 52, left: -15 }}>
                    <CartesianGrid stroke="#e9eef0" vertical={false} />
                    <XAxis dataKey="village_name" interval={0} angle={-33} textAnchor="end" height={66} tick={{ fontSize: 9, fill: "#66756d" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#66756d" }} />
                    <Tooltip formatter={(value) => [`${numberFormat.format(Number(value))} / 100`, "Skor prioritas"]} />
                    <Bar dataKey="score" name="Skor prioritas" radius={[5, 5, 0, 0]} maxBarSize={42}>
                      {results.map((result) => <Cell key={result.village_id} fill={categoryInfo[result.category]?.color || "#94a39b"} />)}
                      <LabelList dataKey="score" position="top" formatter={(value) => numberFormat.format(Number(value))} style={{ fontSize: 9, fill: "#39483f", fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="priority-panel priority-distribution-panel">
              <PanelHeading icon={Activity} title="Distribusi Kategori Prioritas" subtitle="Jumlah desa per kategori." />
              <div className="priority-donut-layout">
                <div className="priority-donut-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="count" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
                        {categoryData.map((item) => <Cell key={item.key} fill={item.color} />)}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} desa`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="priority-donut-center"><strong>{results.length}</strong><span>desa</span></div>
                </div>
                <div className="priority-distribution-list">{categoryData.map((item) => <div key={item.key}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{item.count}</strong></div>)}</div>
              </div>
            </article>

            <article className="priority-panel priority-summary-table-panel">
              <PanelHeading icon={Target} title="Ringkasan Kategori" subtitle="Sebaran hasil, bukan alokasi debit air." />
              <div className="priority-table-wrap"><table className="priority-category-table">
                <thead><tr><th>Prioritas</th><th>Desa</th><th>Rata-rata skor</th><th>Persentase</th></tr></thead>
                <tbody>{categoryData.map((item) => <tr key={item.key}><td><span className={`priority-category-badge priority-${item.key}`}>{item.name}</span></td><td>{item.count}</td><td>{item.count ? numberFormat.format(item.averageScore) : "—"}</td><td>{numberFormat.format(item.share)}%</td></tr>)}</tbody>
              </table></div>
              <div className="priority-total-row"><Droplets size={17} /><strong>{results.length} desa dianalisis</strong><span>100%</span></div>
              <p className="priority-model-caveat">Data debit dan kapasitas saluran belum tersedia, jadi aplikasi tidak mengestimasi alokasi dalam m³.</p>
            </article>
          </section>
          <p className="priority-page-disclaimer"><MapPin size={14} />Skor adalah urutan urgensi relatif. Verifikasi lapangan tetap diperlukan sebelum keputusan distribusi air.</p>
        </>
      )}
    </div>
  );
}

export default PetaPrioritas;
