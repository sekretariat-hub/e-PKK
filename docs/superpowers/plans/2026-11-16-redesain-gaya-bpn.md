# Redesain tampilan e-PKK gaya BPN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah tampilan dashboard dan halaman login e-PKK menjadi gaya BPN PKKI (sidebar bergrup, kartu membulat, kartu angka, chip) dengan palet navy + merah + emas dari logo BPK Bandung.

**Architecture:** Tampilan dashboard digenerate dari `docs/prototipe-artifact.html` oleh `scripts/build-ui.mjs` ke `src/ui/dashboard-html.ts`. Aplikasi sudah memakai variabel CSS dan sudah punya sidebar (`nav#side.tabs.side`, `.shell`, laci di HP). Jadi pekerjaan = ganti token warna/font, restyle sidebar + header + komponen, tambah label grup menu, dan restyle `/masuk`. Logika JS, hak akses, dan Airtable tidak disentuh.

**Tech Stack:** Next.js 15 (App Router), TypeScript, vitest, HTML/CSS prototipe.

**Spec:** `docs/superpowers/specs/2026-11-16-redesain-gaya-bpn-design.md`

## Global Constraints

- Jangan ubah route API, `src/lib/*`, skema/akses Airtable. Tidak ada tabel/field baru.
- Semua tombol menu tetap `button.tabbtn[data-tab]` dengan `id="tabbtn-<id>"`, `role="tab"`, di dalam `nav#side`. Skrip lama (`showTab`, `applyMe`, `EPK_*_OPEN`) bergantung pada ini.
- Pola yang dipatch `scripts/build-ui.mjs` (`swap(...)`) harus tetap ada persis di prototipe: `<title>Pengurus BPKPKK Bandung</title>`, `<meta name="claude:viewport-fit-sides" content="cover">`, `  <header class="brand">`, `    <button type="button" class="tabbtn" role="tab" id="tabbtn-admin"`, `  <div id="tab-admin" class="tab"`, dll. Jalankan `node scripts/build-ui.mjs` setelah tiap perubahan prototipe; jika melempar "pola tidak ditemukan", pola rusak.
- Tes lama `tests/tabel-style.test.ts` mencocokkan string CSS tabel secara persis (`.tablebox, .tw, .inv-tw { overflow: auto; max-height: 70vh;`, `border-collapse: separate; border-spacing: 0`, aturan selang-seling `var(--bg)`, dll). Jangan ubah string itu; `--accent-soft` tetap dipakai untuk hover baris.
- Warna (dari spec): navy `#1E2F6B` (hover `#2C418F`), merah `#C62F2F`, emas `#E8B923`, teks `#172040`, latar `#F6F5FA`, garis `#E6E9F3`, kartu putih radius 16px. Mode gelap (`prefers-color-scheme` dan `[data-theme="dark"]`) harus tetap terbaca.
- Bahasa antarmuka Indonesia. Nomor WA/email umat tetap hanya sebagai tombol.
- Kerja di branch `redesain-gaya-bpn`, bukan `main`.

## Review Focus

- Pengguna hanya punya 1-2 tab: label grup menu yang semua isinya disembunyikan tidak boleh tampil (tes di Task 2).
- Mode gelap: teks menu aktif, kartu, dan chip harus kontras (cek manual di Task 5).
- Layar HP <=860px: laci sidebar membuka/menutup, logo di laci terlihat, tombol "☰ Menu" tetap jalan (Task 2, 5).
- Nama menu panjang ("Pewarta, pengajar & konselor", "Administrasi pengguna") membungkus tanpa memotong (Task 2).
- Banner "view as"/pengguna menunggu persetujuan dan cetak (`@media print`) tidak rusak (Task 5).

---

### Task 1: Token warna, font, dan kerangka halaman

**Files:**
- Modify: `docs/prototipe-artifact.html` (blok `:root`, dark-mode, `body`, `.wrap`, link font)
- Create: `tests/tema-bpn.test.ts`
- Regenerates: `src/ui/dashboard-html.ts` (lewat build-ui)

**Interfaces:**
- Produces: variabel CSS `--navy`, `--navy2`, `--red`, `--gold`, `--accent` (= navy), `--accent-soft`, `--bg`, `--surface`, `--line`, `--fg`, `--muted`, `--r: 16px`, `--sh` (bayangan lembut). Task 2-4 memakainya.

- [ ] **Step 1: Tulis tes gagal `tests/tema-bpn.test.ts`**: panggil `renderDashboard(acc)` (acc seperti di `tests/tabel-style.test.ts`) dan assert `html` memuat `--navy: #1E2F6B`, `--red: #C62F2F`, `--gold: #E8B923`, `--bg: #F6F5FA`, link font `family=Inter`, dan TIDAK memuat `--accent: #0f5c63`.
- [ ] **Step 2: Jalankan** `npx vitest run tests/tema-bpn.test.ts`. Expected: FAIL.
- [ ] **Step 3: Ganti token** di `:root` (terang) dan dua blok gelap: `--accent` = navy terang/biru muda di mode gelap (mis. `#8FA4F0`), `--accent-soft` = tint navy (`#E8ECF8`; gelap `#1D2750`), tambah token di atas, `--font-body` dan `--font-display` = `"Inter","Segoe UI",system-ui,sans-serif`, ganti `<link>` Google Fonts ke Inter 400/500/600/700/800. `body`: latar gradasi halus `radial-gradient` biru muda ke krem (mengikuti login BPN), hilangkan `padding-block` besar. Palet `--k0..--k8` dibiarkan.
- [ ] **Step 4: Jalankan** `node scripts/build-ui.mjs && npx vitest run tests/tema-bpn.test.ts tests/tabel-style.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `git add docs/prototipe-artifact.html src/ui/dashboard-html.ts tests/tema-bpn.test.ts && git commit -m "feat(ui): token warna navy/merah/emas dan font Inter"` (tambahkan baris Co-Authored-By dan Claude-Session dari pengingat atribusi).

### Task 2: Sidebar bergrup bergaya BPN

**Files:**
- Modify: `docs/prototipe-artifact.html` (markup `nav#side`, CSS `.side`, `.tabbtn`, `.sidetgl`, `.sideback`, JS `applyMe`/`showTab` hanya bila perlu)
- Modify: `scripts/build-ui.mjs` bila menu baru (Inventaris, Keuangan, Program Kerja) disisipkan di posisi yang bergantung pada label grup
- Test: `tests/tema-bpn.test.ts`

**Interfaces:**
- Consumes: variabel dari Task 1.
- Produces: `.sidebrand` (logo + "BPK PKK Bandung" + "Dashboard"), label grup `<div class="navgrp" role="presentation" data-grp="...">`, fungsi JS `syncNavGroups(): void` yang menyembunyikan `.navgrp` jika semua `.tabbtn` sesudahnya sampai grup berikut disembunyikan; dipanggil di akhir `applyMe()` dan tiap `showTab`.

- [ ] **Step 1: Tulis tes gagal**: `renderDashboard` dengan `tabs: ["Dashboard"]` harus memuat string `function syncNavGroups` dan `class="sidebrand"`; juga assert urutan grup: Utama (Dashboard) · Pelayanan (Pengurus, Pewarta, Pewarta luar kota, PD, Umat) · Kegiatan (Kalender, Event & pendaftar, KEP, Program Kerja) · Administrasi (Inventaris, Keuangan, Administrasi pengguna) lewat `indexOf` label berurutan.
- [ ] **Step 2: Jalankan** tes; Expected: FAIL.
- [ ] **Step 3: Markup**: di dalam `nav#side` tambahkan `.sidebrand` di atas (logo `/logo.png` 44px, nama, subjudul) dan kartu pengguna `.sideme` di bawah yang diisi dari `window.__ME__` (nama, level) oleh `applyMe`. Sisipkan `.navgrp` sebelum tombol pertama tiap grup. Tombol menu yang disisipkan `build-ui.mjs` (Inventaris, Keuangan, Program Kerja) dipindah ke grupnya dengan mengubah titik sisip di build-ui; jaga urutan `TABS` array tetap.
- [ ] **Step 4: CSS**: sidebar lebar 252px putih, `border-right: 1px solid var(--line)`, tinggi penuh sticky; `.tabbtn` radius 12px, padding 10px 12px, ikon titik 8px berwarna per grup; `[aria-selected="true"]` = latar `--navy`, teks putih, bayangan `0 6px 14px rgba(30,47,107,.25)`, dan garis emas 3px di kiri; `.navgrp` huruf kecil kapital 11px `--muted`. Pertahankan perilaku laci HP (`@media (max-width: 860px)`) dan `.sideback`.
- [ ] **Step 5: Jalankan** `node scripts/build-ui.mjs && npx vitest run tests/tema-bpn.test.ts` dan `npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(ui): sidebar bergrup gaya BPN`.

### Task 3: Header halaman dan komponen (kartu, kartu angka, tombol, chip, tab)

**Files:**
- Modify: `docs/prototipe-artifact.html` (CSS `header.brand`, `.tile`, `.btn`, `.chip`, `.pill`, `.fil`, `.tabs`/sub-tab di dalam menu, `.dlg`, kartu `.band`/`.card` jika ada)
- Test: `tests/tema-bpn.test.ts`

**Interfaces:**
- Consumes: token Task 1.

- [ ] **Step 1: Tes gagal**: assert HTML memuat `.tile::after` (lingkaran pastel di sudut) dan `.btn.primary { background: var(--navy)`.
- [ ] **Step 2: Jalankan**; Expected: FAIL.
- [ ] **Step 3: CSS**: `header.brand` jadi bilah atas lengket dengan blur: logo 40px (disembunyikan di desktop karena sudah di sidebar, tampil di HP), judul 22px `-0.01em`, `#me` di kanan; tombol Muat ulang/Cetak bergaya `.ghost` BPN bila sudah ada tombolnya, jangan menambah fitur baru. Kartu: `border-radius: var(--r)`, `box-shadow: var(--sh)`. `.tile`: padding 18px, angka 38px 800 warna navy, lingkaran tint 96px di pojok kanan atas (`::after`), warna tint bergantian lewat kelas yang sudah ada. `.btn` radius 12px; `.btn.primary` latar `--navy`, hover `--navy2`. `.chip`/`.pill` mengikuti chip BPN (radius 999px, tint). Input/select radius 12px, fokus outline `--navy`. Sub-tab di dalam menu: garis bawah 3px navy untuk aktif. Jangan sentuh string CSS tabel yang diuji `tabel-style.test.ts`.
- [ ] **Step 4: Jalankan** `node scripts/build-ui.mjs && npm test && npm run typecheck`. Expected: semua PASS.
- [ ] **Step 5: Commit** `feat(ui): kartu, kartu angka, tombol, dan chip gaya BPN`.

### Task 4: Halaman login `/masuk`

**Files:**
- Modify: `src/app/masuk/page.tsx`
- Create: `src/app/masuk/masuk.module.css`
- Test: `tests/masuk.test.tsx` (render ke string dengan `react-dom/server`)

**Interfaces:**
- Consumes: logo `/logo.png`. Tetap memakai `signIn("google", { redirectTo: dest })` dan logika `dest` yang ada, tanpa perubahan.

- [ ] **Step 1: Tes gagal**: `renderToStaticMarkup(await Masuk({ searchParams: Promise.resolve({}) }))` memuat `<img` dengan `src="/logo.png"`, teks `Masuk dengan Google`, dan `BPK PKK Bandung`.
- [ ] **Step 2: Jalankan**; Expected: FAIL.
- [ ] **Step 3: Implementasi** kartu putih 390px radius 22px di tengah, logo 84px, judul navy 19px, subjudul abu, tombol navy penuh lebar "Masuk dengan Google", latar gradasi `radial-gradient` biru muda dan krem, pesan bahwa akun harus sudah didaftarkan sekretariat. Pindahkan style inline ke `masuk.module.css`.
- [ ] **Step 4: Jalankan** `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): halaman masuk gaya BPN`.

### Task 5: Pemeriksaan visual dan preview

**Files:** tidak ada kode baru kecuali perbaikan temuan.

- [ ] **Step 1: Build penuh** `npm run build`. Expected: sukses.
- [ ] **Step 2: Dorong branch** `git -C /home/claude/e-pkk -c push.negotiate=true push -u origin redesain-gaya-bpn`; ambil URL preview Vercel dari komentar/status deployment di GitHub.
- [ ] **Step 3: Periksa di built-in browser** halaman `/masuk` dan, bila pemilik sudah login di panel browser, `/dashboard`: layar desktop, lebar HP (laci sidebar), mode gelap, tiap menu satu per satu (tabel, peta PD, kalender, Keuangan, Inventaris), dan cetak. Catat dan perbaiki CSS yang rusak, lalu ulangi Step 1 dan commit `fix(ui): ...`.
- [ ] **Step 4: Laporkan ke pemilik** link preview dan daftar yang masih perlu dipoles. Jangan menggabung ke `main` sebelum disetujui.
