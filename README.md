# Karangampel Irrigation AI

Prototype Sistem Pendukung Keputusan untuk mengurutkan prioritas kebutuhan air irigasi di 11 desa Kecamatan Karangampel. Proyek UTS mendemonstrasikan dua kategori AI: Mamdani Fuzzy Logic dan A* Search.

## Menjalankan aplikasi

Backend dan frontend berjalan di dua terminal.

Terminal backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Terminal frontend:

```powershell
cd frontend
npm run dev
```

Buka URL Vite yang ditampilkan di terminal. Dokumentasi API FastAPI tersedia di `/docs`. Jalankan backend dari folder `backend` agar SQLite memakai file `backend/irrigation.db`.

## Alur demo

1. Pastikan daftar desa tersedia di halaman **Data Desa**.
2. Catat kondisi untuk satu atau lebih desa di **Input Data**.
3. Buka **Analisis AI** untuk melihat skor, aturan Fuzzy yang aktif, ranking, dan rute A*.
4. Gunakan **Simulasi Skenario** untuk mengubah faktor ketersediaan tanpa mengubah catatan tersimpan.
5. Cetak **Laporan Demo** sebagai ringkasan hasil yang sedang tampil.

## Akun dan akses

Saat backend pertama kali dijalankan, sistem membuat dua akun lokal jika username tersebut belum ada:

| Peran | Username | Password awal |
| --- | --- | --- |
| Admin | `admin` | `AdminDemo2026!` |
| Petugas Lapangan | `petugas` | `PetugasDemo2026!` |

Pendaftaran umum membuat akun Petugas dan meminta desa penugasan. Untuk membuat akun Admin maupun Petugas dari aplikasi, masuk sebagai Admin lalu buka **Kelola Akun**. Admin dapat mengubah penugasan desa dan mengaktifkan/menonaktifkan akun. Akun Admin tidak dapat dibuat melalui pendaftaran umum.

Untuk mengganti username/password bootstrap sebelum akun dibuat, atur `IRRIGATION_ADMIN_USERNAME`, `IRRIGATION_ADMIN_PASSWORD`, `IRRIGATION_FIELD_USERNAME`, dan `IRRIGATION_FIELD_PASSWORD` di environment sebelum backend pertama dijalankan. Akun yang sudah ada tidak diubah otomatis. Kredensial awal di atas hanya untuk demo lokal; ganti sebelum aplikasi dipasang pada server bersama.

Hak akses mengikuti matriks peran:

| Fitur | Admin | Petugas Lapangan |
| --- | --- | --- |
| Dashboard | Semua desa | Desa tugas |
| Lihat daftar desa | Semua desa | Semua desa |
| Tambah/edit catatan irigasi | Semua desa | Desa tugas; hasil edit menunggu validasi |
| Validasi catatan Petugas | Setujui/tolak | Tidak tersedia |
| Analisis AI | Jalankan dan lihat semua hasil | Lihat snapshot hasil untuk desa tugas |
| Simulasi skenario | Tersedia | Tidak tersedia |
| Kelola akun | Tersedia | Tidak tersedia |
| Hapus catatan | Semua catatan | Tidak tersedia |
| Unduh laporan | Keseluruhan | Desa tugas |

Analisis yang terlihat Petugas adalah hasil terakhir yang dijalankan Admin. Perubahan pada data tervalidasi menghapus snapshot tersebut sampai Admin menjalankan analisis kembali. API juga memeriksa peran dan desa tugas; menyembunyikan menu saja tidak menjadi pembatas akses.

Password disimpan dalam bentuk hash, sesi berakhir setelah 12 jam, dan API data memerlukan sesi aktif. Akun demo Petugas awal dapat ditetapkan ke desa melalui **Kelola Akun** oleh Admin.

Ketersediaan dan kebutuhan dicatat pada skala 0–100. Gunakan data lapangan atau sumber yang dapat dijelaskan. Seed hanya memuat nama desa; proyek tidak mengisi angka irigasi buatan sebagai fakta.

## Batasan demo

- Fuzzy saat ini memakai ketersediaan dan kebutuhan air; kolom musim, umur tanaman, kondisi saluran, dan hujan disimpan sebagai konteks, belum memengaruhi skor.
- Graf A* dan koordinat simpulnya adalah simulasi abstrak untuk memperlihatkan algoritma, bukan peta jaringan irigasi Karangampel.
- Sistem menghasilkan urutan prioritas dan lintasan simulasi.
- Koordinat desa, debit saluran, kapasitas jaringan, dan data lapangan masih perlu dikumpulkan serta divalidasi sebelum klaim operasional.

## Struktur penting

```text
backend/app/ai/              Fuzzy Logic dan A* Search
backend/app/api/             endpoint desa, irigasi, dan analisis
backend/app/models/          model SQLAlchemy
frontend/src/pages/          dashboard dan halaman demo
docs/uts/                    draft laporan, slide, dan logbook
```


