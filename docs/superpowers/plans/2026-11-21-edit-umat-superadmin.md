# Edit Data Umat (Superadmin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Superadmin dapat mengedit 15 isian data umat (tanpa Foto) dari tab Umat, tersimpan ke tabel MasterData TeamUmat.

**Architecture:** Aturan tulis baru di `policy.ts` khusus Superadmin; route `/api/umat-form` menyediakan pilihan (select, PD, Paroki); skrip UI baru `umat-edit-js.ts` memasang tombol Edit dan dialog, menyimpan lewat `/api/airtable`.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Airtable REST, vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-21-edit-umat-superadmin-design.md`

## Global Constraints

- Jangan menghapus tabel/baris Airtable. "Hapus?" hanya mencentang `fldxZvnqVvAH4aWyd`.
- Tidak membuat tabel atau field baru di Airtable (bila ternyata perlu: laporkan dan email ke timmy.theopelus@gmail.com).
- WA dan email tidak boleh ada di daftar Umat atau HTML untuk non-Superadmin; hanya diambil per rekaman saat Edit ditekan.
- Hak ditegakkan di server (`policy.ts`), bukan hanya UI. Bahasa antarmuka Indonesia.
- Base `appIGR8Duhj3Vsz48`, tabel umat `tblwRNtXSVzgzVXuk`, tabel paroki `tbl8sfqU6G47orPpn`, tabel PD `tblNjwoOJEGZeQxkJ`.

## Review Focus

1. Mengosongkan isian (mis. Email, Kualifikasi, Paroki) harus benar-benar mengosongkan di Airtable: `null` untuk teks/select/tanggal, `[]` untuk link/pilihan ganda.
2. Email tidak valid, Nama atau No WA kosong, Jenis Kelamin kosong: ditolak di form dan di server, tanpa menulis apa pun.
3. Level Edit, Admin, View, atau Superadmin dalam mode "Lihat sebagai" tidak bisa memakai field tambahan.
4. Klik Simpan dua kali tidak mengirim dua permintaan.
5. Umat tanpa PD atau tanpa Paroki membuka form tanpa error.

## File Structure

- Modify `src/lib/policy.ts`: `UMAT_SUPER` (daftar field) dan aturan `superUpdate` pada `TABLES[T.umat]`; `checkWrite` memakainya.
- Create `src/lib/umat-form.ts`: `getUmatFormMeta()`, `validateUmatFields()`.
- Create `src/app/api/umat-form/route.ts`: GET, khusus Superadmin.
- Create `src/ui/umat-edit-js.ts`: konstanta string `UMAT_EDIT_JS`.
- Modify `src/ui/render.ts`: sisipkan `UMAT_EDIT_JS` bila Superadmin dengan tab Umat dan bukan `viewAs`.
- Tests: `tests/umat-edit-policy.test.ts`, `tests/umat-form.test.ts`, `tests/umat-edit-ui.test.ts`.

---

### Task 1: Aturan tulis Superadmin di policy

**Files:**
- Modify: `src/lib/policy.ts` (spec `T.umat`, fungsi `checkWrite`)
- Test: `tests/umat-edit-policy.test.ts`

**Interfaces:**
- Produces: `export const UMAT_SUPER: string[]` berisi 15 ID field berikut: `fld0P7TE88KvYXORT, fldIpQTSkFB9sU0lo, fld469PYR80nAUNIF, fldzY1Z2QvIIEkYXR, fldsVrUbWf6iT5Jja, fldAaQ3zmiLBhp4z9, fldXGHvqnezzKZSCp, fldxpeouH1hcxMzNc, fldcQFzBtr9EELTtV, fldrHJ6q3HZvApccl, fldE62NyXuSJLvM8h, fldQQpyVKX2eZGokY, fldwywmGiZMscPgKq, fld8wFTduClZ9Y5Al, fldxZvnqVvAH4aWyd`.
- `checkWrite(spec, "update", records, acc)` tetap bersignatur sama; untuk `T.umat`, bila `acc.level === "Superadmin"` dan `acc.tabs` memuat `"Umat"`, field di `UMAT_SUPER` boleh (selain `PERSON` yang sudah ada).

- [ ] **Step 1: Tulis tes** di `tests/umat-edit-policy.test.ts` (pola `tests/policy.test.ts`, `base` dengan tabs `["Umat"]`):
  - `Superadmin + tab Umat boleh mengubah semua 15 field` → `not.toThrow()` untuk `{ id: "rec1", fields: { fld0P7TE88KvYXORT: "Yosef", fldxZvnqVvAH4aWyd: true, fldE62NyXuSJLvM8h: ["recP1"] } }`.
  - `Superadmin menolak field di luar daftar` (mis. `fldWLeXoMSiVp5RbG` Foto, `fld1Hoz1aNGsuzggS` formula) → `toThrow(HttpError)`.
  - `Edit, Admin, View dengan tab Umat menolak field baru` (mis. `fld0P7TE88KvYXORT`) → `toThrow(HttpError)`.
  - `Superadmin tanpa tab Umat ditolak` → `toThrow(HttpError)`.
- [ ] **Step 2: Jalankan** `npx vitest run tests/umat-edit-policy.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** `UMAT_SUPER` dan perluasan `Spec` dengan `superUpdate?: { tabs: string[]; fields: string[] }` di `TABLES[T.umat]` (`tabs: ["Umat"]`). Di `checkWrite`, untuk kind `update` dan `acc.level === "Superadmin"`, gabungkan `rule.fields` dengan `superUpdate.fields` bila `any(acc, superUpdate.tabs)`; syarat tab lama (`rule.tabs`) tidak dipakai untuk field tambahan. Hati-hati: Superadmin tetap lolos aturan lama untuk `PERSON` di tab Pengurus/Pewarta.
- [ ] **Step 4: Jalankan** tes di Step 2 dan `npx vitest run tests/policy.test.ts`. Harapan: PASS.
- [ ] **Step 5: Commit** `git add src/lib/policy.ts tests/umat-edit-policy.test.ts && git commit -m "feat: izin tulis 15 field umat untuk Superadmin"`

### Task 2: Pilihan form dan validasi (server)

**Files:**
- Create: `src/lib/umat-form.ts`, `src/app/api/umat-form/route.ts`
- Test: `tests/umat-form.test.ts`

**Interfaces:**
- Consumes: `getSchema(base)` dan `listUntil(...)` dari `src/lib/airtable.ts`; `UMAT_SUPER`, `BASE_BPK`, `T`, `HttpError` dari `policy.ts`; `effectiveAccess`, `AS_COOKIE` dari `viewas.ts` (pola `src/app/api/viewas/route.ts` dan `src/app/api/airtable/route.ts`).
- Produces:
  - `type UmatFormMeta = { jk: string[]; libat: string[]; kualifikasi: string[]; alumni: string[]; pd: { id: string; nama: string }[]; paroki: { id: string; nama: string }[] }`
  - `getUmatFormMeta(): Promise<UmatFormMeta>` (opsi select dibaca dari skema Airtable; PD = nama primer tabel PD; Paroki = nama primer tabel Paroki; keduanya urut abjad).
  - `validateUmatFields(f: Record<string, any>): string | null` mengembalikan pesan Indonesia atau `null`. Aturan: `fldIpQTSkFB9sU0lo`, `fldzY1Z2QvIIEkYXR`, `fldxpeouH1hcxMzNc` wajib terisi; `fldAaQ3zmiLBhp4z9` bila terisi harus cocok `^[^@\s]+@[^@\s]+\.[^@\s]+$`; `fldXGHvqnezzKZSCp` bila terisi harus `YYYY-MM-DD`. Hanya mengevaluasi kunci yang ada di `f`, kecuali wajib: dipanggil dengan data penuh dari form.
  - Route `GET /api/umat-form` → JSON `UmatFormMeta`; 401 tanpa login; 403 bila bukan Superadmin atau `acc.viewAs`.

- [ ] **Step 1: Tulis tes** `tests/umat-form.test.ts`:
  - `validateUmatFields` menolak: Nama kosong, WA kosong, Jenis Kelamin kosong, email `abc`, tanggal `10/07/1971`; menerima data lengkap dengan email kosong dan tanggal `1971-07-10`.
  - `getUmatFormMeta` dengan `vi.mock("@/lib/airtable")` (skema berisi opsi, `listUntil` mengembalikan dua rekaman PD): hasil `pd` urut abjad dan `jk` sama dengan `["Pria","Wanita"]`.
  - Route: mock `auth` dan `effectiveAccess`; level `Edit` → status 403; `Superadmin` → 200.
- [ ] **Step 2: Jalankan** `npx vitest run tests/umat-form.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** dua fungsi dan route sesuai Interfaces. Cache hasil meta di memori 5 menit (pola `nameCache` di `airtable.ts`).
- [ ] **Step 4: Jalankan** tes Step 2. Harapan: PASS.
- [ ] **Step 5: Commit** `git add src/lib/umat-form.ts src/app/api/umat-form tests/umat-form.test.ts && git commit -m "feat: route pilihan form edit umat + validasi"`

### Task 3: Tombol Edit dan dialog di tab Umat

**Files:**
- Create: `src/ui/umat-edit-js.ts`
- Modify: `src/ui/render.ts` (sisip skrip), mungkin `scripts/build-ui.mjs` bila perlu kait tambahan
- Test: `tests/umat-edit-ui.test.ts` (pola `tests/inventaris-ui.test.ts`, jsdom)

**Interfaces:**
- Consumes: `GET /api/umat-form` (Task 2), `POST /api/airtable` dengan `tool: "list_records_for_table"` (`recordIds:[id]`, `fieldIds: UMAT_SUPER`) dan `tool: "update_records_for_table"` (`records:[{id, fields}]`); global `D.ua`, `renderUmat()`, `esc()` dari prototipe; `window.__ME__.level`.
- Produces: `export const UMAT_EDIT_JS: string`; `renderDashboard(acc)` memuat skrip itu hanya bila `acc.level === "Superadmin" && acc.tabs.includes("Umat") && !acc.viewAs`.

Perilaku (nilai persis):
- Sebuah `MutationObserver` pada `#uaBody` menambah tombol `class="act" data-ua-edit="<recId>"` berlabel "Edit" di `.acts` setiap baris (setelah View, sebelum Email) bila belum ada.
- Klik Edit: dialog "Edit data umat" berisi 15 isian urut Fillout, label sama dengan Fillout, wajib bertanda `*` (Nama Lengkap, No Whatsapp Aktif, Jenis Kelamin). Nilai awal dari `list_records_for_table` satu rekaman; pilihan dari `/api/umat-form`. PD/Paroki = `<select>` dengan opsi kosong "(kosong)". Keterlibatan dan Alumni = kotak centang. Kualifikasi = tombol radio dengan opsi "(kosong)".
- Simpan: validasi klien (aturan sama dengan `validateUmatFields`, pesan Indonesia di area `role="alert"`), hanya kirim field yang berubah dari nilai awal. Kosong → `null` (teks, select, tanggal, kualifikasi) atau `[]` (link, pilihan ganda). Tombol Simpan `disabled` selama permintaan berjalan.
- Sukses: tutup dialog, perbarui `D.ua` (nama `fldIpQTSkFB9sU0lo`, panggilan `fld469PYR80nAUNIF`, nama PD), buang baris bila "Hapus?" dicentang, panggil `renderUmat()`; tampilkan pesan "Tersimpan." Gagal: pesan error dari server, dialog tetap terbuka.

- [ ] **Step 1: Tulis tes** `tests/umat-edit-ui.test.ts`:
  - `renderDashboard` Superadmin+Umat memuat `data-ua-edit`/`UMAT_EDIT_JS`; level `Edit`, `View`, dan Superadmin `viewAs` tidak memuatnya; HTML tidak memuat string email/WA contoh dari data uji.
  - jsdom: dengan `fetch` palsu, tombol Edit muncul pada baris baru; buka dialog dengan `/api/umat-form` dan rekaman palsu → 15 isian terisi; ubah Nama Baptis lalu Simpan → payload `update_records_for_table` hanya `{ fld0P7TE88KvYXORT: "Yosef" }`.
  - Kosongkan Email dan pilih "(kosong)" pada Paroki → payload `{ fldAaQ3zmiLBhp4z9: null, fldE62NyXuSJLvM8h: [] }`.
  - Nama kosong → tidak ada panggilan `update_records_for_table`; muncul pesan di `role="alert"`.
  - Klik Simpan dua kali beruntun → satu panggilan update.
  - Rekaman tanpa PD dan Paroki → dialog terbuka tanpa error.
- [ ] **Step 2: Jalankan** `npx vitest run tests/umat-edit-ui.test.ts`. Harapan: FAIL.
- [ ] **Step 3: Implementasi** `UMAT_EDIT_JS` (ES5 klasik seperti `admin-js.ts`, memakai helper `EPK.el` bila tersedia di prototipe; lihat `admin-js.ts` untuk cara dialog dan `fetch` ke `/api/...`) dan sisipan di `render.ts` seperti `admin`/`inv`.
- [ ] **Step 4: Jalankan** `npm test`. Harapan: semua PASS (tes lama tidak rusak, termasuk `tabel-style` dan `menu-layout`).
- [ ] **Step 5: Commit** `git add src/ui src/ui/render.ts tests/umat-edit-ui.test.ts && git commit -m "feat: tombol dan dialog Edit umat untuk Superadmin"`

### Task 4: Verifikasi akhir

**Files:** tidak ada perubahan kode.

- [ ] **Step 1: Jalankan** `npm run typecheck && npm test && npm run build`. Harapan: tanpa error.
- [ ] **Step 2: Uji manual** di `npm run dev` atau pratinjau Vercel dengan akun Superadmin: edit satu umat uji, cek hasilnya di Airtable (baris sama, hanya field yang diubah), lalu kembalikan nilainya. Cek akun level Edit: tombol Edit tidak ada.
- [ ] **Step 3: Dorong** cabang `feat/edit-umat-superadmin` dan buka PR; jangan merge ke `main` tanpa persetujuan pemilik (Vercel deploy dari `main`).
