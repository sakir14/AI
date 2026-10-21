# Draft Laporan Proyek UTS

> Lengkapi bagian bertanda `[isi kelompok]`, catat hasil yang benar-benar muncul saat demo, dan lampirkan dokumentasi asli. Graf rute dalam prototype adalah simulasi, bukan data saluran lapangan.

## Identitas kelompok

| Nama | NIM | Tanggung jawab |
|---|---|---|
| [isi kelompok] | [isi kelompok] | [isi kelompok] |
| [isi kelompok] | [isi kelompok] | [isi kelompok] |
| [isi kelompok] | [isi kelompok] | [isi kelompok] |
| [opsional] | [opsional] | [opsional] |

**Tautan repository bersama:** [isi kelompok setelah dibuat]

## Judul

**Karangampel Irrigation AI: Sistem Pendukung Keputusan Prioritas Distribusi Air dengan Mamdani Fuzzy Logic dan A* Search**

## Ringkasan

[Tulis ringkasan akhir setelah sistem didemokan: masalah, dua metode AI, data yang digunakan, hasil uji, serta batasan. Jangan mengklaim keberhasilan sebelum menjalankan skenario dan merekam hasilnya.]

## Latar belakang dan ruang lingkup

Distribusi air irigasi merupakan masalah layanan wilayah yang melibatkan sumber daya terbatas dan kondisi yang berubah. Pemerintah Kabupaten Indramayu pernah melaporkan pembersihan saluran sekunder Sipetung menuju persawahan Karangampel setelah saluran mengalami pendangkalan/sedimentasi pada Januari 2023. Ini menjadi contoh konteks lokal, bukan bukti bahwa kondisi saluran saat ini sama.

Karena dosen mengizinkan topik tugas besar yang sudah berjalan, proyek ini memakai studi kasus irigasi Karangampel sebagai layanan lingkungan/infrastruktur lokal dalam konteks Smart City.

BPS Kabupaten Indramayu mencatat 4.181 rumah tangga usaha pertanian dan 3.893 rumah tangga pertanian pengguna lahan di Kecamatan Karangampel pada 2023. Pemerintah Kabupaten Indramayu mencantumkan 11 desa di kecamatan ini. Angka tersebut memberi konteks wilayah, tetapi tidak digunakan sebagai input skor karena bukan pengukuran kondisi air terkini.

**Ruang lingkup prototype:** menerima catatan kondisi per desa, menghitung urutan prioritas relatif dari ketersediaan dan kebutuhan air, kemudian mencari rute pada graf irigasi abstrak untuk desa dengan prioritas tertinggi. Prototype tidak menetapkan debit nyata atau jumlah alokasi air.

## Tujuan dan pengguna

- Membantu pengelola membandingkan urgensi relatif antardesa berdasarkan input yang dicatat.
- Menunjukkan proses penalaran Fuzzy dan proses pencarian A* yang dapat dijelaskan saat demo.
- Menyediakan simulasi perubahan skala ketersediaan untuk membandingkan hasil.

Pengguna demo adalah pengelola/admin yang memasukkan data. Hasil merupakan dukungan keputusan, bukan keputusan otomatis untuk operasi irigasi.

## Data dan asumsi

| Data | Satuan/skala | Peran |
|---|---|---|
| Ketersediaan air | 0–100% | Input Fuzzy |
| Kebutuhan air | 0–100% | Input Fuzzy |
| Umur tanaman, musim, kondisi saluran, curah hujan | hari, periode, kategori, mm | Disimpan sebagai konteks; belum masuk perhitungan skor |
| Nama desa | teks | Menghubungkan catatan ke salah satu desa |
| Koordinat dan jaringan saluran untuk A* | koordinat abstrak dan unit biaya simulasi | Graf demonstrasi buatan, bukan data geografis |

Persentase harus didefinisikan dan diisi berdasarkan prosedur pengukuran yang disepakati kelompok. Tanpa data lapangan terverifikasi, kasus angka pada laporan harus diberi label **ilustrasi/simulasi**. Tidak ada volume m³ dalam model saat ini.

Parameter fungsi keanggotaan di bawah adalah rancangan awal prototype untuk demonstrasi metode. Kelompok perlu menjelaskan dasar pemilihannya dan meminta validasi dosen/pakar sebelum menyebutnya sebagai parameter operasional pertanian.

## Metode 1 — Mamdani Fuzzy Logic

### Variabel dan himpunan

Fungsi keanggotaan menggunakan trapezoid `(a,b,c,d)` atau segitiga `(a,b,c)`. Nilai variabel dibatasi pada 0–100.

| Variabel | Himpunan | Parameter |
|---|---|---|
| Ketersediaan | Rendah | trap `(0, 0, 35, 60)` |
| Ketersediaan | Sedang | segitiga `(35, 60, 85)` |
| Ketersediaan | Tinggi | trap `(60, 85, 100, 100)` |
| Kebutuhan | Rendah | trap `(0, 0, 30, 55)` |
| Kebutuhan | Sedang | segitiga `(30, 55, 80)` |
| Kebutuhan | Tinggi | trap `(55, 80, 100, 100)` |
| Prioritas keluaran | Rendah | trap `(0, 0, 20, 40)` |
| Prioritas keluaran | Sedang | segitiga `(20, 45, 70)` |
| Prioritas keluaran | Tinggi | segitiga `(50, 70, 90)` |
| Prioritas keluaran | Sangat tinggi | trap `(75, 90, 100, 100)` |

### Basis aturan

| Ketersediaan \ Kebutuhan | Rendah | Sedang | Tinggi |
|---|---|---|---|
| Rendah | Sedang | Tinggi | Sangat tinggi |
| Sedang | Rendah | Sedang | Tinggi |
| Tinggi | Rendah | Rendah | Sedang |

Operator AND menggunakan minimum. Implikasi aturan menggunakan minimum, agregasi keluaran menggunakan maksimum, lalu defuzzifikasi menggunakan centroid pada domain bilangan bulat 0–100:

`skor = Σ(x × μ_agregat(x)) / Σ(μ_agregat(x))`

Kategori laporan aplikasi: skor `≤25` Rendah, `≤50` Sedang, `≤75` Tinggi, selebihnya Sangat tinggi. Aturan aktif beserta derajat aktivasi dikembalikan API agar proses dapat diterangkan.

## Metode 2 — A* Search

Graf prototype memiliki simpul sumber simulasi, tiga simpul cabang simulasi, dan desa. Sisi dua arah menghubungkan sumber/cabang/desa. Posisi simpul pada kode adalah koordinat abstrak. Biaya sisi dihitung dari jarak Euclidean antarposisi tersebut; heuristik `h(n)` juga jarak Euclidean dari simpul saat ini ke desa sasaran. Fungsi evaluasinya:

`f(n) = g(n) + h(n)`

Fuzzy memilih desa sasaran dengan skor tertinggi; A* mencari lintasan berbiaya terendah menuju desa itu pada graf simulasi. Nilai biaya disebut **unit simulasi**, bukan kilometer. Koordinat dan koneksi harus diganti dengan jaringan saluran terverifikasi sebelum rute ditafsirkan sebagai kondisi nyata.

Koneksi graf: sumber terhubung ke Cabang A, B, dan C; Cabang A–B serta B–C saling terhubung; setiap desa terhubung ke cabang kelompoknya. Mundu, Kaplonganlor, dan Tanjungpura berada di kelompok Cabang A; Tanjungsari, Pringgacala, Benda, dan Sendang di Cabang B; Karangampel Kidul, Karangampel, Dukuh Jeruk, dan Dukuh Tengah di Cabang C. Seluruh hubungan ini adalah asumsi untuk simulasi.

| Simpul contoh | Koordinat abstrak |
|---|---:|
| Sumber air (simulasi) | `(0, 0)` |
| Cabang A (simulasi) | `(2, 2)` |
| Cabang B (simulasi) | `(2, 0)` |
| Cabang C (simulasi) | `(2, -2)` |
| Mundu | `(3, 3)` |

**Contoh hitung A* ke Mundu:** `h(Sumber, Mundu) = √18 ≈ 4,24`. Rute Sumber → Cabang A → Mundu memiliki `g = √8 + √2 ≈ 4,24` unit. `f(n)=g(n)+h(n)` dipakai untuk memilih simpul berikutnya; target Mundu berhenti saat dikeluarkan dari antrean prioritas.

## Alur sistem

```text
Catatan irigasi terbaru per desa
              ↓
Fuzzifikasi ketersediaan dan kebutuhan
              ↓
Evaluasi 9 aturan Mamdani → centroid → skor dan ranking
              ↓
Pilih desa dengan skor tertinggi
              ↓
A* mencari lintasan pada graf simulasi
              ↓
Dashboard, analisis, rekomendasi urutan, dan simulasi
```

## Skenario uji manual

Kasus berikut merupakan **ilustrasi matematis**, bukan data lapangan. Ambil tangkapan layar dan catat angka aktual dari aplikasi ketika kelompok menjalankan demo.

| Kasus | Ketersediaan | Kebutuhan | Aktivasi aturan yang diharapkan | Keluaran yang diharapkan |
|---|---:|---:|---|---|
| A — tekanan air tinggi | 30% | 90% | Rendah AND Tinggi, aktivasi 1,00 | Kategori prioritas Sangat tinggi |
| B — pasokan relatif cukup | 80% | 20% | Tinggi AND Rendah, aktivasi 0,80; Sedang AND Rendah, aktivasi 0,20 | Kategori prioritas Rendah |
| C — perubahan skenario | Data satu atau lebih desa yang sudah dicatat | Tetap | Jalankan skala ketersediaan 100%, lalu 50% | Catat perubahan skor/ranking; nilai aktual diisi setelah demo |
| D — pencarian rute | Desa sasaran hasil ranking | — | A* dijalankan dari sumber simulasi | Lintasan berakhir pada sasaran; biaya adalah unit simulasi |

### Hasil eksekusi kelompok

| Kasus | Skor aktual | Ranking aktual | Bukti/screenshot | Catatan |
|---|---:|---:|---|---|
| A | [isi setelah demo] | [isi] | [lampirkan] | [isi] |
| B | [isi setelah demo] | [isi] | [lampirkan] | [isi] |
| C | [isi setelah demo] | [isi] | [lampirkan] | [isi] |
| D | [isi setelah demo] | [isi] | [lampirkan] | [isi] |

## Kesimpulan

[Isi setelah uji: jelaskan apakah urutan Fuzzy berubah secara masuk akal pada setiap skenario, apakah A* menemukan lintasan pada graf yang disediakan, serta batasan yang ditemui. Jangan menyebut rute simulasi sebagai jaringan asli.]

## Dokumentasi dan lampiran

- Identitas anggota dan pembagian tugas.
- Logbook praktikum dan pengerjaan di luar laboratorium.
- Screenshot proses input dan hasil setiap skenario.
- Source code/repository dan instruksi menjalankan aplikasi.
- Bukti sumber data serta penjelasan mana data faktual dan mana input ilustrasi.

## Checklist rubrik

- **Produk dan pemodelan (40%)**: demonstrasikan kedua metode, aturan Fuzzy, fungsi keanggotaan, graf pencarian, dan integrasinya pada satu studi kasus.
- **Laporan (25%)**: sertakan representasi pengetahuan, tabel/graf, kasus uji, hasil aktual, analisis, dan kesimpulan.
- **Presentasi dan demo (20%)**: batasi slide maksimal 10, jaga total presentasi 15 menit termasuk demo/tanya jawab, dan siapkan anggota untuk menjelaskan algoritma.
- **Dokumentasi dan kolaborasi (15%)**: lengkapi logbook, pembagian kontribusi, bukti kegiatan, serta repository/source yang bisa dijalankan ulang.

## Referensi awal

1. Pemerintah Kabupaten Indramayu, [Daftar nama desa di Kabupaten Indramayu](https://indramayukab.go.id/daftar-nama-desa-di-kabupaten-indramayu/).
2. BPS Kabupaten Indramayu, [Rumah tangga usaha pertanian dan rumah tangga petani menurut kecamatan, 2023](https://indramayukab.bps.go.id/id/statistics-table/1/NTUjMQ%3D%3D/jumlah-rumah-tangga-usaha-pertanian-dan-jumlah-rumah-tangga-petani-subsektor-menurut-kecamatan-dan-subsektor-di-kabupaten-indramayu--2023.html).
3. Pemerintah Kabupaten Indramayu, [Pembersihan saluran sekunder Sipetung menuju persawahan Karangampel, 20 Januari 2023](https://indramayukab.go.id/pastikan-irigasi-persawahan-lancar-camat-karangampel-dan-poktan-bersih-bersih-sungai/).
4. Template UTS Kecerdasan Buatan SIKC3A, dokumen yang diberikan dosen, Tahun Akademik 2026/2027.

## Catatan pembacaan soal

Template menyebut integrasi minimal dua dari lima kelompok materi, tetapi daftar yang terbaca hanya memuat empat kategori: search, logic reasoning, Bayesian reasoning, dan Fuzzy Logic. Kombinasi Fuzzy + A* memenuhi dua kategori yang tercantum; konfirmasi jumlah kategori kepada dosen bila diperlukan.
