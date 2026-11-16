# Desain: WA untuk permintaan persetujuan + peringatan bila WA gagal

Tanggal: 2026-11-16 · Pemilik: Timmy / Sekretariat BPK PKK Bandung · Status: menunggu persetujuan pemilik

## Maksud
Pemegang akun yang harus menyetujui sesuatu sering tidak membuka dashboard. Maka setiap permintaan persetujuan, selain muncul di lonceng, dikirim langsung ke WhatsApp pribadi pemutusnya berisi link untuk bertindak. Bila pengiriman WA (apa pun jenisnya) gagal karena masalah sistem, orang yang bisa memperbaikinya segera diberi tahu lewat email.

## Tujuan
- Pemutus menerima WA pribadi untuk tiap permintaan persetujuan, dengan link langsung ke tindakan.
- Bila WA gagal karena sistem (bukan salah nomor), email ke Sekretaris, Koordinator BPK, dan Sekjen.

## Bukan tujuan
- Tidak mengirim WA untuk kabar biasa (mis. "program Anda disetujui") dan tidak untuk tiap pendaftar peserta SEP.
- Tidak mengganti gateway (tetap BaBlast, `src/lib/wa.ts`) dan tidak membuat tabel Airtable baru.
- Tidak ada percobaan ulang otomatis untuk pesan teks (risiko terkirim ganda).

## Anti-tujuan (dianggap gagal walau jalan)
- WA berhamburan sehingga nomor sender (tidak resmi) diblokir WhatsApp.
- Email peringatan membanjiri kotak masuk saat gateway mati.
- Nomor WA, API key, atau token tampil di UI, log, atau email.

## Pendekatan yang dipertimbangkan
- **A. Fungsi pusat `mintaApproval` (dipilih pemilik).** Satu fungsi membuat lonceng + WA + penanganan gagal, dipanggil eksplisit di empat titik. Untung: hanya permintaan persetujuan yang jadi WA, aturan di satu tempat. Rugi: empat titik panggil harus diubah dan diuji.
- B. Menempel di `buatNotif`. Perubahan kecil, tetapi semua kabar lonceng ikut jadi WA; berisiko blokir nomor. Ditolak.
- C. Automation Airtable. Token harus ditaruh di script, terpisah dari aplikasi, tanpa link tindakan terpadu. Ditolak.

## Keputusan pemilik
| Permintaan | Penerima WA |
|---|---|
| User baru | Sekretariat dan Sekretaris |
| Program kerja | Pemutus tahap yang berlaku; seksi terlibat pada tahap Kolaborasi (mengikuti penerima lonceng yang sudah ada) |
| Pewarta luar kota | Sekretaris Jenderal |
| SEP baru | Tim SEP BPK. **Persetujuan dulu**: kegiatan berstatus "Menunggu persetujuan", link pendaftaran mati sampai Tim SEP setuju. Pendaftar peserta tidak memicu WA. |

Peringatan gagal berlaku untuk **semua** pengiriman WA (OTP login, kirim WA admin, dan permintaan persetujuan), bukan hanya SEP. Penerima email: Sekretaris, Koordinator BPK, Sekjen.

## Rancangan
1. **`mintaApproval({ jenis, penerima, pesan, tautan })`** (modul baru): membuat lonceng via `buatNotif`, lalu mengirim WA ke tiap penerima. Nomor WA dari MasterData TeamUmat lewat link Umat pada Pengguna Dashboard (pola `sekjenContact`). Jeda 60 detik per penerima+jenis agar klik ganda tidak mengirim dobel. Kegagalan satu penerima tidak menghentikan yang lain, dan tidak membatalkan permintaannya sendiri.
2. **Pesan WA**: ringkasan satu-dua baris + link absolut (`appUrl()`) ke halaman tindakan. Tidak memuat data pribadi di luar yang perlu.
3. **Peringatan gagal di `kirimWa`** (`wa.ts`): hanya untuk gagal sistem (503 belum dikonfigurasi, 502 gateway/timeout). Nomor tidak valid (400) tidak memicu email. Email lewat SMTP yang ada, dibatasi satu per jam per jenis gagal (penghitung di memori server, tanpa tabel baru). Isi email: waktu, jenis pesan, kode status; tanpa key atau nomor penuh.
4. **Titik panggil**: (a) `access.ts` saat email baru login (menggantikan hanya-email ke Superadmin; email lama tetap); (b) `proker.ts` pada penerima `buatNotif` saat program diajukan dan pada tahap berikutnya; (c) pewarta luar kota (lihat Hal untuk pembangun); (d) `sepCall create`.
5. **SEP baru**: status awal "Menunggu Persetujuan" (opsi baru di field Status SEP yang sudah ada). `kegByToken` / `submitPublic` menolak kegiatan yang belum "Berjalan". Aksi baru `setujui` / `tolak` hanya untuk peran Tim SEP; pemohon dikabari lewat lonceng (bukan WA).
6. **Pewarta luar kota**: permohonan masuk dari aplikasi lain (base SMP), bukan dari e-PKK. Pemicu yang dipilih: automation Airtable yang sudah ada ("e-PKK: email Sekjen saat ada permohonan pewarta luar kota baru") diubah agar memanggil endpoint e-PKK ber-secret, sehingga e-PKK yang mengirim WA. Dedup memakai catatan di tabel Notifikasi (tautan `luar:<id>`), tanpa field baru.

## Perubahan Airtable (wajib dilaporkan + email ke timmy.theopelus@gmail.com sebelum dibuat)
- Satu opsi baru "Menunggu Persetujuan" pada field Status SEP (tabel SEP Kegiatan). Tidak ada tabel atau field baru. Tidak ada yang dihapus.
- Automation pewarta luar kota diubah dan diaktifkan (bukan tabel/field).

## Keamanan
API key BaBlast hanya di env server. Token gateway lama (maestrobyte) tertulis polos di script automation Airtable lain; disarankan dipindah ke variabel rahasia dan dibuat ulang, di luar lingkup ini tetapi dilaporkan.

## Hal untuk pembangun (keputusan teknis)
- Bentuk link tindakan per jenis (`proker:ID`, halaman kelola pengguna, halaman SEP, jadwal pewartaan) ditentukan dari rute yang ada.
- Saat SEP dibuat, record Events (kalender) tetap dibuat langsung. Akibatnya kegiatan yang belum disetujui tampil di kalender. Pembangun menentukan penandaannya.
- Penerima tanpa nomor WA: tetap dapat lonceng, dicatat sebagai gagal-sebagian, tanpa email (bukan gagal sistem).
- Endpoint webhook memakai secret di header, dibandingkan dengan `timingSafeEqual`.
- Uji: `fetch` ditiru; periksa body `{phone, message}`, jeda 60 detik, peringatan hanya pada 502/503, batas satu email per jam, dan tidak ada key di pesan error.
