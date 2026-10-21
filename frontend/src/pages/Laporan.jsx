import { useState } from "react";
import { Activity, AlertCircle, FileText, Printer, Target, TriangleAlert } from "lucide-react";
import useAnalysis from "../hooks/useAnalysis";

const labels = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  sangat_tinggi: "Sangat tinggi",
};

function Laporan() {
  const { analysis, loading, error } = useAnalysis();
  const [printedAt, setPrintedAt] = useState("");
  const results = analysis?.results || [];
  const highestPriority = results.reduce(
    (highest, result) => result.score > highest.score ? result : highest,
    results[0] || { score: -1 },
  );
  const urgentCount = results.filter((result) => ["sangat_tinggi", "tinggi"].includes(result.category)).length;

  const printReport = () => {
    setPrintedAt(new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }));
    window.requestAnimationFrame(() => window.print());
  };

  return (
    <div className="report-page">
      <header className="report-page-header no-print">
        <span className="report-page-icon"><FileText size={23} /></span>
        <div className="report-page-heading">
          <h1>Laporan</h1>
          <p>Ringkasan hasil analisis prioritas desa yang siap dicetak atau disimpan sebagai PDF.</p>
        </div>
        <button className="report-print-button" type="button" onClick={printReport} disabled={!results.length || loading}>
          <Printer size={17} /> Cetak / Simpan PDF
        </button>
      </header>

      <div className="report-guidance no-print"><TriangleAlert size={17} /><span>Laporan ini merangkum hasil aplikasi. Lengkapi identitas kelompok, latar belakang, pembahasan metode, hasil pengujian, dan sumber data untuk laporan UTS lengkap.</span></div>

      {error && <div className="error-message form-message no-print"><AlertCircle size={16} />{error}</div>}
      {loading ? (
        <p className="priority-loading">Memuat data laporan...</p>
      ) : !results.length ? (
        <div className="report-empty-state no-print">
          <span><FileText size={22} /></span>
          <div><h2>Belum ada hasil untuk dilaporkan</h2><p>Masukkan dan validasi catatan irigasi, lalu jalankan Analisis AI.</p></div>
        </div>
      ) : (
        <article className="report-sheet">
          <header className="report-document-header">
            <div className="report-document-brand">
              <span><Activity size={21} /></span>
              <div><p className="report-kicker">Proyek UTS Kecerdasan Buatan</p><h1>Karangampel Irrigation AI</h1></div>
            </div>
            <span className="report-document-tag">Ringkasan Analisis</span>
            <p className="report-document-intro">Sistem pendukung keputusan prioritas distribusi air irigasi menggunakan metode Mamdani Fuzzy Logic dan pencarian rute A*.</p>
          </header>

          <div className="report-meta">
            <span><strong>Nama kelompok</strong><span>________________________________</span></span>
            <span><strong>Tanggal cetak</strong><span>{printedAt || "Diisi saat laporan dicetak"}</span></span>
          </div>

          <section className="report-summary-grid" aria-label="Ringkasan hasil analisis">
            <div className="report-summary-card"><span>Desa dianalisis</span><strong>{results.length}</strong><small>Desa dengan hasil Fuzzy</small></div>
            <div className="report-summary-card"><span>Prioritas tertinggi</span><strong>{highestPriority.village_name || "—"}</strong><small>{highestPriority.score >= 0 ? `Skor ${highestPriority.score.toFixed(2)} / 100` : "Belum tersedia"}</small></div>
            <div className="report-summary-card"><span>Prioritas tinggi</span><strong>{urgentCount}</strong><small>Desa kategori tinggi dan sangat tinggi</small></div>
          </section>

          <section className="report-section">
            <div className="report-section-heading"><span><Target size={17} /></span><div><h2>Hasil Prioritas Desa</h2><p>Urutan berdasarkan skor hasil analisis Fuzzy Logic.</p></div></div>
            <div className="table-scroll">
              <table className="data-table report-results-table">
                <thead><tr><th>Rank</th><th>Desa</th><th>Skor Fuzzy</th><th>Kategori</th><th>Tanggal Data</th></tr></thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.village_id}>
                      <td><span className="report-rank-badge">{result.rank}</span></td>
                      <td><strong>{result.village_name}</strong></td>
                      <td>{result.score.toFixed(2)}</td>
                      <td><span className={`report-category-badge report-category-${result.category}`}>{labels[result.category] || result.category}</span></td>
                      <td>{result.recorded_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {analysis.route && (
            <section className="report-route-section">
              <div className="report-section-heading"><span><Target size={17} /></span><div><h2>Rute Pencarian A*</h2><p>Lintasan graf simulasi menuju sasaran prioritas.</p></div></div>
              <p className="report-route-path">{analysis.route.path.join(" → ")}</p>
              <small>Biaya lintasan pada graf simulasi: {analysis.route.cost_units} unit.</small>
            </section>
          )}

          <p className="report-disclaimer">Catatan: skor prioritas menunjukkan urgensi relatif, bukan volume alokasi air. Rute A* menggunakan graf abstrak untuk demonstrasi dan bukan jaringan irigasi terverifikasi.</p>
        </article>
      )}
    </div>
  );
}

export default Laporan;
