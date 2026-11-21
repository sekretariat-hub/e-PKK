# Edit data umat oleh Superadmin (desain singkat)

Tanggal: 2026-11-21. Disetujui pemilik di percakapan (cara 1 + form mengikuti Fillout "Edit Database TeamUmat v1.0", tanpa Foto).

## Maksud
Superadmin (saat ini Felicia Monica Prasetia) dapat memperbaiki data umat langsung dari tab Umat di dashboard, tanpa lewat form Fillout. Data tersimpan ke tabel MasterData TeamUmat (`tblwRNtXSVzgzVXuk`, base `appIGR8Duhj3Vsz48`).

## Tujuan
- Tombol **Edit** di tiap baris tab Umat, hanya untuk level Superadmin.
- Form berisi persis isian di form Fillout (16 isian), kecuali Foto.
- Penegakan hak di server (`src/lib/policy.ts`), bukan hanya menyembunyikan tombol.

## Bukan tujuan
- Foto (unggah lampiran): ditunda ke tahap berikutnya.
- Hapus baris umat. "Hapus?" hanya menandai data dobel (checkbox `fldxZvnqVvAH4aWyd`), tidak menghapus baris.
- Mengubah field formula/lookup/rollup/tombol, dan tidak ada tabel atau field baru di Airtable (jadi tidak ada laporan atau email ke pemilik).

## Pendekatan
Dipilih: form mengikuti urutan Fillout, dibuat sebagai skrip UI baru `src/ui/umat-edit-js.ts` (dikirim hanya ke Superadmin, seperti `admin-js.ts`), penulisan lewat `/api/airtable` (`update_records_for_table`), dan satu route baru `/api/umat-form` untuk pilihan select, daftar PD, dan daftar Paroki. Ditolak: form otomatis dari skema (terlalu panjang, ±65 field) dan memperluas dialog `openEditPerson` di prototipe (berkas 4000 baris yang dipakai ulang oleh tab lain, berisiko merusak Pengurus/Pewarta).

## Field (ID Airtable)
| Isian | Field | Tipe |
|---|---|---|
| Nama Baptis | `fld0P7TE88KvYXORT` | teks |
| Nama Lengkap* | `fldIpQTSkFB9sU0lo` | teks (wajib) |
| Nama Panggilan | `fld469PYR80nAUNIF` | teks |
| No Whatsapp Aktif* | `fldzY1Z2QvIIEkYXR` | teks (wajib) |
| No Lain | `fldsVrUbWf6iT5Jja` | teks |
| Email | `fldAaQ3zmiLBhp4z9` | email |
| Tanggal Lahir | `fldXGHvqnezzKZSCp` | tanggal |
| Jenis Kelamin* | `fldxpeouH1hcxMzNc` | pilihan (Pria/Wanita) |
| Alamat Tinggal | `fldcQFzBtr9EELTtV` | teks panjang |
| PD Komunitas | `fldrHJ6q3HZvApccl` | link, satu |
| Paroki | `fldE62NyXuSJLvM8h` | link ke `tbl8sfqU6G47orPpn`, satu |
| Keterlibatan di BPKPKK | `fldQQpyVKX2eZGokY` | pilihan ganda |
| Kualifikasi | `fldwywmGiZMscPgKq` | pilihan tunggal (boleh dikosongkan) |
| Alumni | `fld8wFTduClZ9Y5Al` | pilihan ganda |
| Hapus? | `fldxZvnqVvAH4aWyd` | centang (tanda data dobel) |

## Keputusan saya (bisa dikoreksi)
- CLAUDE.md melarang WA/email tampil di UI. Form edit memang harus menampilkan keduanya, jadi: hanya untuk Superadmin, dan nilainya diambil dari server satu rekaman saja saat Edit ditekan. Daftar Umat tetap tanpa WA/email.
- Pilihan PD dan Paroki memakai daftar dari server (nama saja).
- Pilihan select diambil dari skema Airtable, bukan ditulis ulang di kode.
- Simpan hanya mengirim field yang berubah. Nama dan WA wajib diisi.
- Sesudah simpan, baris di daftar diperbarui tanpa memuat ulang semuanya.

## Keamanan
- `policy.ts`: aturan tulis baru untuk umat khusus `level === "Superadmin"` dan tab Umat, dengan daftar field di atas. Level Edit/Admin tidak mendapat field tambahan.
- Mode "Lihat sebagai" tetap menolak penulisan (sudah ada di `/api/airtable`).
- Uji: policy (Superadmin lolos, Edit/Admin/View ditolak, field di luar daftar ditolak) dan UI (tombol hanya untuk Superadmin).
