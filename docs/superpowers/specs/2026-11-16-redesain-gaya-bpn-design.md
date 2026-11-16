# Redesain tampilan e-PKK mengikuti gaya BPN PKKI

Tanggal: 2026-11-16. Status: disetujui pemilik (pendekatan A).

## Tujuan
Dashboard BPKPKK Bandung meniru gaya Sistem Informasi BPN PKKI (https://bpnpkki.vercel.app, repo `sekretariat-hub/bpnpkki`): sidebar kiri, kartu putih membulat, chip dan kartu angka berwarna, tab bergaris bawah, login berkartu. Nuansa warna dibuat berbeda dari BPN: biru tua dengan aksen merah dan emas dari logo BPK Bandung.

## Bukan tujuan
- Tidak mengubah logika data, hak akses, route API, atau Airtable (tidak ada tabel/field baru, jadi tidak perlu email laporan).
- Tidak menulis ulang UI ke React.
- Tidak mengurangi menu yang ada.

## Pendekatan (dipilih: A)
- A. Ganti tampilan di tempat: tulis ulang CSS di `docs/prototipe-artifact.html` dan ubah bar tab menjadi sidebar. Tombol menu tetap `.tabbtn[data-tab]` sehingga `showTab`, `window.__ME__.tabs`, dan skrip Inventaris/Keuangan/Proker/Admin tidak berubah. Dipilih karena risiko paling kecil.
- B. Hanya stylesheet timpaan: kurang rapi, sidebar tetap butuh perubahan markup.
- C. Tulis ulang ke React: terlalu besar dan berisiko merusak fitur berjalan.

## Rancangan
- Warna (keputusan Claude, bisa disesuaikan): navy `#1E2F6B` (hover `#2C418F`), merah `#C62F2F`, emas `#E8B923`, teks `#172040`, latar `#F6F5FA`, garis `#E6E9F3`, kartu putih radius 16px, bayangan lembut. Tint pastel mengikuti BPN.
- Sidebar 252px: logo `/logo.png` + "BPK PKK Bandung", menu dikelompokkan (Utama: Dashboard; Pelayanan: Pengurus, Pewarta, Pewarta luar kota, PD, Umat; Kegiatan: Kalender, Event & pendaftar, KEP, Program Kerja; Administrasi: Inventaris, Keuangan, Administrasi pengguna), menu aktif kotak navy bertitik emas, kartu pengguna di bawah. Hanya menu yang diizinkan `__ME__.tabs` yang tampil (logika lama dipertahankan).
- Header halaman: judul tab aktif + subjudul, tombol Muat ulang/Cetak.
- Mobile (<900px): sidebar menjadi laci dengan tombol ☰.
- `/masuk`: kartu putih di tengah, logo, tombol "Masuk dengan Google", latar gradasi biru muda ke krem.
- Komponen lama (tabel, kartu, chip, peta, grafik) disesuaikan agar memakai variabel warna baru.

## Penerapan
Branch `redesain-gaya-bpn`, bukan `main`. Vercel membuat preview; pemilik menilai sebelum digabung. Setelah mengubah prototipe, jalankan `node scripts/build-ui.mjs` dan `npm test`/`typecheck`.

## Diserahkan ke pelaksana
Detail pengelompokan menu, ikon SVG, dan penyesuaian komponen per tab.
