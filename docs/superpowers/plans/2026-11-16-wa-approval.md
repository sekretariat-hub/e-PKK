# WA untuk Permintaan Persetujuan + Peringatan WA Gagal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tiap permintaan persetujuan (user baru, program kerja, pewarta luar kota, SEP baru) dikirim ke WA pribadi pemutusnya dengan link tindakan, dan setiap kegagalan sistem pengiriman WA memicu email ke Sekretaris, Koordinator BPK, dan Sekjen.

**Architecture:** Modul baru `minta-approval.ts` (lonceng + WA per penerima) dipanggil eksplisit di empat titik. Peringatan gagal dipasang di `kirimWa` (`wa.ts`) lewat `wa-alert.ts`, sehingga mencakup semua WA. Penerima dihitung dari jabatan di Pengguna Dashboard (`penerima.ts`); nomor WA dari data umat.

**Tech Stack:** Next.js (App Router) + TypeScript, Airtable REST, BaBlast (`kirimWa`), nodemailer (`mail.ts`), vitest.

**Spec:** `docs/superpowers/specs/2026-11-16-wa-approval-design.md`

## Global Constraints

- Dilarang menghapus tabel/field Airtable. Tidak ada tabel atau field baru; satu-satunya perubahan skema adalah opsi baru "Menunggu Persetujuan" pada field Status SEP (`fldidtKcy6zhf1owX`, tabel `tblGuf3UnMnGBqpbR`), dilaporkan dan di-email ke timmy.theopelus@gmail.com SEBELUM dibuat.
- API key BaBlast hanya dari env server; tidak ke browser, log, atau email. Nomor WA tidak tampil di UI, log, atau email (tersamar `6281****842` bila perlu dicatat).
- Jeda 60 detik per penerima+jenis permintaan untuk mencegah kirim ganda. Tidak ada retry otomatis pesan teks.
- Peringatan gagal hanya untuk status 503 dan 502 dari `kirimWa`; 400 (nomor tidak valid) tidak memicu email. Maksimum satu email per jam per jenis gagal. Penerima email: Sekretaris, Koordinator BPK, Sekretaris Jenderal.
- WA hanya untuk permintaan persetujuan; bukan untuk kabar biasa dan bukan untuk tiap pendaftar peserta SEP.
- Bahasa antarmuka dan pesan: Indonesia. Hak akses ditegakkan di server.
- Pengerjaan di cabang `fitur/wa-approval` dari `main` (deploy pratinjau = e-pkk-beta); `npm test` hijau sebelum tiap commit.

## Review Focus

- Kegagalan WA ke satu penerima tidak boleh membatalkan permintaannya sendiri atau WA penerima lain (pengaju tetap melihat sukses).
- Penerima tanpa nomor WA atau nomor tak valid: tetap dapat lonceng, tidak ada email peringatan.
- Gateway mati saat banyak orang login (OTP): hanya satu email per jam, bukan satu per OTP.
- Link pendaftaran SEP yang belum disetujui harus ditolak dengan pesan jelas, bukan "tidak valid" atau malah menerima pendaftar.
- Webhook pewarta luar kota dipanggil dua kali untuk permohonan yang sama: WA ke Sekjen hanya sekali; tanpa secret yang benar ditolak 401.

---

### Task 0: Laporan perubahan skema dan opsi Status SEP

**Files:** tidak ada kode.

- [ ] **Step 1:** Kirim email ke timmy.theopelus@gmail.com (Gmail `send_message`) dan laporkan ke pemilik di chat: "Menambah satu opsi 'Menunggu Persetujuan' pada field Status SEP (SEP Kegiatan). Tidak ada tabel/field baru, tidak ada yang dihapus."
- [ ] **Step 2:** Setelah email terkirim, tambahkan opsi lewat Airtable `update_field` pada `fldidtKcy6zhf1owX` dengan menyertakan semua opsi yang sudah ada (ambil dulu lewat `get_table_schema`) ditambah "Menunggu Persetujuan". Periksa ulang skema: opsi lama utuh.

### Task 1: Penghitung penerima

**Files:**
- Create: `src/lib/penerima.ts`
- Test: `tests/penerima.test.ts`

**Interfaces:**
- Produces: `emailsByJabatan(re: RegExp): Promise<string[]>` (email akun Status "Disetujui" yang jabatannya cocok, huruf kecil, unik); `emailsTimSep(): Promise<string[]>` (akun dengan `sepPeran === "Tim SEP BPK"` atau level Superadmin tidak termasuk); `nomorWaOf(email: string): Promise<string>` ("" bila tak ada); konstanta `RE_APPROVER_USER = /sekretaris|sekretariat/i`, `RE_ALERT = /^sekretaris$|sekretaris jenderal|koordinator/i`.
- Consumes: `listPage`, `getRecord` dari `airtable.ts`; `AF`, `jabatanOf` dari `access.ts`; `BASE_BPK`, `T` dari `policy.ts`.

- [ ] **Step 1: Test.** `emailsByJabatan` hanya mengembalikan akun "Disetujui" dengan jabatan cocok (akun "Menunggu" dan jabatan lain dikecualikan, duplikat dibuang); `emailsTimSep` hanya Tim SEP BPK; `nomorWaOf` mengambil `fldzY1Z2QvIIEkYXR` dari umat yang ditautkan (pola `sekjenContact` di `approval.ts`) dan mengembalikan "" bila akun tak punya link umat. Tiru `fetch` seperti `tests/notif.test.ts`.
- [ ] **Step 2:** Jalankan `npx vitest run tests/penerima.test.ts`; harus gagal (modul belum ada).
- [ ] **Step 3:** Implementasi tiga fungsi; ambil daftar pengguna dengan `listPage(BASE_BPK, T.pengguna, { fieldIds: Object.values(AF), formula: '{Status}="Disetujui"' })`, cache 5 menit. Sebelum mengunci `RE_APPROVER_USER` dan `RE_ALERT`, baca nama jabatan nyata di tabel MasterJabatanBPK (`tblrfilR2eNUOiFMa`, hanya baca) dan sesuaikan regex agar "Koordinator BPK" dan "Sekretaris" cocok, "Sekretaris Jenderal" tidak ikut sebagai Sekretaris biasa untuk persetujuan user baru.
- [ ] **Step 4:** Tes hijau. **Step 5:** Commit `feat: penghitung penerima persetujuan dan peringatan`.

### Task 2: Peringatan WA gagal (semua WA)

**Files:**
- Create: `src/lib/wa-alert.ts`
- Modify: `src/lib/wa.ts` (di dalam `kirimWa`, sebelum `throw` 503 dan 502), `src/lib/mail.ts` (tambah `kirimEmail`)
- Test: `tests/wa-alert.test.ts`, tambah satu kasus di `tests/kirim-wa.test.ts`

**Interfaces:**
- Produces: `kirimEmail(to: string[], subject: string, text: string): Promise<boolean>` di `mail.ts` (pakai konfigurasi SMTP yang sama dengan `notifyOwner`; false bila SMTP belum diatur); `laporWaGagal(kode: 502 | 503, ringkas: string): Promise<void>` di `wa-alert.ts` (tidak pernah melempar).
- Consumes: `emailsByJabatan`, `RE_ALERT` dari Task 1.

- [ ] **Step 1: Test.** (a) dua kali `laporWaGagal(502, ...)` dalam satu jam memanggil `kirimEmail` sekali; kode 503 punya jatah sendiri; setelah 1 jam (`vi.useFakeTimers`) boleh lagi. (b) email tidak memuat API key maupun nomor penuh dan memuat kode status. (c) bila `kirimEmail` melempar, `laporWaGagal` tetap selesai tanpa error. (d) di `kirimWa`: respons 500 → melempar 502 DAN memanggil `laporWaGagal(502, ...)`; nomor tak valid (400) TIDAK memanggilnya.
- [ ] **Step 2:** Jalankan keempat tes; harus gagal.
- [ ] **Step 3:** Implementasi. Subjek `[e-PKK] Pengiriman WhatsApp gagal`. Panggil `laporWaGagal` tanpa `await` yang menunggu hasil (jangan menunda respons pengguna) tetapi tangkap error-nya.
- [ ] **Step 4:** `npx vitest run tests/wa-alert.test.ts tests/kirim-wa.test.ts` hijau. **Step 5:** Commit `feat: email peringatan bila pengiriman WA gagal`.

### Task 3: `mintaApproval`

**Files:**
- Create: `src/lib/minta-approval.ts`
- Test: `tests/minta-approval.test.ts`

**Interfaces:**
- Produces: `mintaApproval(o: { jenis: "user" | "proker" | "luar-kota" | "sep"; penerima: string[]; pesan: string; tautan: string; url: string }): Promise<{ wa: number; tanpaNomor: number; gagal: number }>`. `tautan` = nilai lonceng (mis. `proker:rec…`); `url` = link absolut tindakan.
- Consumes: `buatNotif` (`notif.ts`), `kirimWa` (`wa.ts`), `nomorWaOf` (Task 1).

- [ ] **Step 1: Test.** Untuk 2 penerima: `buatNotif` dipanggil sekali dengan keduanya dan `kirimWa` dua kali dengan pesan memuat `url`; panggilan kedua dalam 60 detik dengan jenis+penerima sama tidak mengirim ulang (fake timers: setelah 61 detik mengirim lagi); `kirimWa` melempar untuk penerima pertama → penerima kedua tetap dikirim dan fungsi tidak melempar (`gagal: 1`); penerima tanpa nomor → `tanpaNomor: 1`, lonceng tetap dibuat; `console.log/error` tidak pernah memuat nomor penuh.
- [ ] **Step 2:** Jalankan; harus gagal.
- [ ] **Step 3:** Implementasi: lonceng dulu, lalu WA berurutan per penerima dengan jeda kecil acak 300–1200 ms (kurangi risiko blokir). Pesan WA: `pesan` + baris kosong + `url`.
- [ ] **Step 4:** Tes hijau. **Step 5:** Commit `feat: mintaApproval (lonceng + WA)`.

### Task 4: User baru

**Files:**
- Modify: `src/lib/access.ts` (`registerLogin`, setelah blok `notifySuperadmins`)
- Test: tambah kasus di `tests/admin.test.ts` atau berkas tes `registerLogin` yang ada

**Interfaces:** Consumes `mintaApproval` (Task 3), `emailsByJabatan` + `RE_APPROVER_USER` (Task 1), `appUrl` (`mail.ts`).

- [ ] **Step 1: Test.** Email baru login → `mintaApproval` dipanggil dengan `jenis: "user"`, penerima = hasil `emailsByJabatan(RE_APPROVER_USER)`, `url` = `appUrl() + "/dashboard?kelola=1"`; login ulang email yang sudah ada tidak memanggilnya; error di `mintaApproval` tidak menggagalkan login.
- [ ] **Step 2:** Gagal dulu. **Step 3:** Panggil di dalam `try/catch` seperti `notifySuperadmins`; email Superadmin lama tetap. **Step 4:** Hijau. **Step 5:** Commit `feat: WA ke Sekretariat/Sekretaris untuk user baru`.

### Task 5: Program kerja

**Files:**
- Modify: `src/lib/proker.ts:105` (pengajuan program)
- Test: tambah kasus di `tests/proker-api.test.ts`

**Interfaces:** Consumes `mintaApproval`; penerima tetap `await emailsWhere((r) => r.sekjen)` (alur sekarang hanya tahap Sekjen; bila tahap lain ditambah kelak, penerimanya mengikuti `buatNotif`).

- [ ] **Step 1: Test.** Pengajuan program memanggil `mintaApproval` (`jenis: "proker"`, `tautan: "proker:<id>"`, `url` memuat id program) dan TIDAK lagi memanggil `buatNotif` terpisah untuk pesan itu (hindari lonceng ganda); `beritahu(...)` (kabar ke pengaju) tetap memakai `buatNotif` biasa tanpa WA.
- [ ] **Step 2:** Gagal dulu. **Step 3:** Ganti baris `buatNotif(...)` di pengajuan dengan `mintaApproval`. **Step 4:** Hijau. **Step 5:** Commit `feat: WA ke pemutus untuk program kerja baru`.

### Task 6: SEP baru perlu persetujuan Tim SEP

**Files:**
- Modify: `src/lib/sep.ts` (`create` ~baris 75–91, `kegByToken` ~232, `submitPublic` ~249, tambah aksi `setujui` dan `tolak` dalam `sepCall`), berkas UI SEP di `src/ui/` (cari lewat `grep -rn "sep/" src/ui`) untuk tombol Setujui/Tolak dan lencana status
- Test: `tests/sep-persetujuan.test.ts`

**Interfaces:** Produces aksi `sepCall("setujui" | "tolak", { kegiatanId: string }, a: Access)` → `{ ok: true, status: "Berjalan" | "Ditolak" }`. Consumes `mintaApproval`, `emailsTimSep`, `peranOf` (`sep.ts`).

- [ ] **Step 1: Test.** (a) `create` menyimpan `Status SEP = "Menunggu Persetujuan"` dan memanggil `mintaApproval` (`jenis: "sep"`, penerima Tim SEP, pesan memuat nama kegiatan dan paroki). (b) `kegByToken`/`submitPublic` pada kegiatan "Menunggu Persetujuan" ditolak 403 dengan pesan "Kegiatan ini belum disetujui Tim SEP BPK." dan tidak membuat pendaftar. (c) `setujui` oleh peran "tim" → status "Berjalan"; oleh "pic" atau "view" → 403; keputusan kedua pada kegiatan yang sudah diputuskan → 409. (d) `tolak` → status "Ditolak" dan pemohon (`Dibuat oleh`) dapat lonceng biasa. (e) pendaftar peserta (`submitPublic` pada kegiatan "Berjalan") tidak memanggil `mintaApproval`. (f) `create` oleh peran "tim" langsung berstatus "Berjalan" (Tim SEP BPK adalah pemutusnya sendiri) dan tidak memicu WA.
- [ ] **Step 2:** Gagal dulu. **Step 3:** Implementasi sesuai tes; entri kalender (Events) tetap dibuat saat `create`, beri awalan nama `"[Menunggu] "` hingga disetujui lalu hapus awalan saat `setujui` (keputusan teknis; jangan menambah field Airtable). **Step 4:** Tombol UI hanya terlihat untuk Tim SEP. **Step 5:** Hijau, commit `feat: SEP baru menunggu persetujuan Tim SEP`.

### Task 7: Webhook pewarta luar kota

**Files:**
- Create: `src/app/api/hook/luar-kota/route.ts`, `src/lib/luar-kota.ts`
- Test: `tests/luar-kota-hook.test.ts`

**Interfaces:** Produces `POST /api/hook/luar-kota` dengan header `x-webhook-secret` (env `HOOK_SECRET`) dan body `{ eventId: string }`; `notifLuarKota(eventId: string): Promise<{ terkirim: boolean }>`. Consumes `mintaApproval`, `emailsWhere((r) => r.sekjen)`, `getRecord`/`listPage` (cek dedupe di tabel Notifikasi dengan `Tautan = "luar:<id>"`).

- [ ] **Step 1: Test.** Tanpa/salah secret → 401 (bandingkan dengan `timingSafeEqual`, `HOOK_SECRET` kosong → 401); `eventId` tidak valid → 400; permohonan valid pertama → `mintaApproval` (`jenis: "luar-kota"`, `tautan: "luar:<id>"`, pesan memuat nama pewarta, PD, tanggal; `url` ke tab pewarta luar kota) dan `terkirim: true`; panggilan kedua dengan id sama → `terkirim: false` tanpa WA; jadwal yang bukan luar kota atau sudah dibatalkan → tidak ada WA.
- [ ] **Step 2:** Gagal dulu. **Step 3:** Implementasi; aturan "luar kota" sama dengan `approval.ts`/SPEC (Asal Pewarta bukan "BPK Bandung"). **Step 4:** Hijau. **Step 5:** Commit `feat: webhook WA permohonan pewarta luar kota`.

### Task 8: Dokumentasi, env, dan verifikasi akhir

**Files:** Modify `docs/SETUP.md`, `README.md` bila memuat daftar env.

- [ ] **Step 1:** Catat env baru `HOOK_SECRET` (dan bahwa `BABLAST_*` dan `SMTP_*` wajib terisi di e-pkk-beta agar WA dan email jalan).
- [ ] **Step 2:** `npm test` (hijau semua) dan `npm run build` (sukses). **Step 3:** Commit `docs: env dan alur WA persetujuan`.
- [ ] **Step 4 (tindakan pemilik, setelah deploy beta):** ubah automation Airtable "e-PKK: email Sekjen saat ada permohonan pewarta luar kota baru" agar memanggil webhook (Task 7) dengan secret, uji ke nomor sendiri, baru aktifkan. Laporkan ke pemilik sebelum mengaktifkan. Selama itu, WA ke nomor sendiri dulu (uji pertama selalu ke nomor sendiri).
- [ ] **Step 5:** Uji manual di beta ke nomor sendiri: user baru, program kerja, SEP baru, dan matikan sementara `BABLAST_API_KEY` untuk memastikan email peringatan terkirim sekali.
