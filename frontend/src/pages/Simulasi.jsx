import { useState } from "react";
import { Activity, AlertCircle, Check, FlaskConical, Info, Target } from "lucide-react";
import api from "../api";
import useAnalysis from "../hooks/useAnalysis";
import RouteGraph from "../components/RouteGraph";

const labels = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  sangat_tinggi: "Sangat tinggi",
};

function Simulasi() {
  const { analysis: baseline, loading, error: baselineError } = useAnalysis();
  const [availability, setAvailability] = useState(100);
  const [scenario, setScenario] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const baselineResults = baseline?.results || [];

  const runScenario = async () => {
    setRunning(true);
    setError("");
    try {
      const response = await api.post("/api/analysis/simulate", {
        availability_scale: availability / 100,
      });
      setScenario(response.data);
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Skenario gagal dihitung.");
    } finally {
      setRunning(false);
    }
  };

  const updateAvailability = (value) => {
    setAvailability(value);
    setScenario(null);
    setError("");
  };

  const baselineRank = new Map(
    baselineResults.map((result) => [result.village_name, result.rank]),
  );
  const recommendedTarget = scenario?.recommended_target;

  return (
    <div className="simulasi-page">
      <header className="simulasi-page-header">
        <span className="simulasi-page-icon"><FlaskConical size={24} /></span>
        <div className="simulasi-page-heading">
          <h1>Simulasi Skenario</h1>
          <p>Uji perubahan ketersediaan air tanpa mengubah catatan yang tersimpan.</p>
        </div>
        <span className="simulasi-mode-badge"><Activity size={14} /> Mode simulasi</span>
      </header>

      <div className="simulasi-info-banner"><Info size={18} /><span>Faktor skenario mengubah ketersediaan relatif tiap desa. Hasil ini bukan prediksi debit maupun alokasi air dalam m³.</span></div>

      <section className="simulasi-control-card">
        <div className="simulasi-section-heading">
          <span><Activity size={18} /></span>
          <div><h2>Atur Ketersediaan Air</h2><p>Pilih faktor untuk menghitung ulang skor prioritas.</p></div>
        </div>
        <div className="simulasi-control-content">
          <div className="simulasi-scale-heading"><label htmlFor="availability-scale">Faktor ketersediaan relatif</label><strong>{availability}%</strong></div>
          <input
            id="availability-scale"
            className="simulasi-range"
            type="range"
            min="0"
            max="100"
            step="5"
            value={availability}
            aria-valuetext={`${availability}% ketersediaan relatif`}
            onChange={(event) => updateAvailability(Number(event.target.value))}
          />
          <div className="simulasi-range-labels"><span>0% · Sangat terbatas</span><span>100% · Kondisi dasar</span></div>
          <div className="simulasi-presets" aria-label="Pilihan faktor cepat">
            {[100, 75, 50, 25].map((value) => (
              <button
                className={availability === value ? "is-active" : ""}
                key={value}
                type="button"
                aria-pressed={availability === value}
                onClick={() => updateAvailability(value)}
              >
                {availability === value && <Check size={14} />}{value}%
              </button>
            ))}
          </div>
          <div className="simulasi-control-footer">
            <p>Simulasi tidak mengubah data input atau hasil analisis dasar.</p>
            <button className="simulasi-run-button" type="button" onClick={runScenario} disabled={running || loading || !baselineResults.length}>
              <FlaskConical size={17} />{running ? "Menghitung skenario..." : "Jalankan Simulasi"}
            </button>
          </div>
        </div>
      </section>

      {(baselineError || error) && <div className="error-message form-message simulasi-error" role="alert"><AlertCircle size={16} />{error || baselineError}</div>}
      {loading && <p className="priority-loading">Memuat data dasar untuk simulasi...</p>}
      {!loading && !baselineResults.length && (
        <div className="simulasi-empty-state">
          <span><Target size={22} /></span>
          <div><h2>Data dasar belum tersedia</h2><p>Masukkan dan validasi data irigasi, lalu jalankan Analisis AI sebelum melakukan simulasi.</p></div>
        </div>
      )}
      {scenario?.results?.length > 0 && (
        <>
          <section className="simulasi-result-card">
            <div className="simulasi-result-target">
              <span className="simulasi-result-kicker"><Target size={14} /> Sasaran skenario {availability}%</span>
              <h2>{recommendedTarget?.village_name || "Belum ditentukan"}</h2>
              {recommendedTarget && <div className="simulasi-result-meta"><strong>Skor {recommendedTarget.score.toFixed(2)}</strong><span className={`simulasi-priority-badge priority-${recommendedTarget.category}`}>{labels[recommendedTarget.category]}</span></div>}
            </div>
            {scenario.route && (
              <div className="simulasi-result-route">
                <span>Rute rekomendasi A*</span>
                <strong>{scenario.route.path.join(" → ")}</strong>
                <small>Lintasan pada graf simulasi, bukan peta saluran aktual.</small>
              </div>
            )}
          </section>
          {scenario.route && <RouteGraph route={scenario.route} targetVillage={recommendedTarget?.village_name} />}
          <section className="data-table-card simulasi-comparison-card">
            <div className="simulasi-section-heading">
              <span><Activity size={18} /></span>
              <div><h2>Perbandingan Prioritas Desa</h2><p>Posisi dan skor setelah faktor ketersediaan diubah menjadi {availability}%.</p></div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Desa</th><th>Rank dasar</th><th>Rank skenario</th><th>Skor skenario</th><th>Kategori</th></tr></thead>
                <tbody>
                  {scenario.results.map((result) => (
                    <tr key={result.village_id}>
                      <td>{result.village_name}</td>
                      <td>{baselineRank.get(result.village_name) ?? "—"}</td>
                      <td><strong>{result.rank}</strong></td>
                      <td>{result.score.toFixed(2)}</td>
                      <td><span className={`simulasi-priority-badge priority-${result.category}`}>{labels[result.category]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Simulasi;
