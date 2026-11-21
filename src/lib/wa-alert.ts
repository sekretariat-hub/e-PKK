// Peringatan email bila pengiriman WA gagal karena sistem (bukan salah nomor). Maksimum satu email per jam per kode.
import { kirimEmail } from "./mail";
import { emailsByJabatan, RE_ALERT } from "./penerima";

const TERAKHIR = new Map<number, number>();
const JEDA = 3_600_000;

const ARTI: Record<number, string> = {
  503: "Pengiriman WA belum dikonfigurasi di server (kunci BaBlast belum diisi).",
  502: "Layanan BaBlast gagal atau tidak menjawab.",
};

/** Hilangkan kunci dan nomor telepon dari teks sebelum masuk email. */
function bersih(s: string): string {
  let t = s;
  const key = process.env.BABLAST_API_KEY;
  if (key) t = t.split(key).join("***");
  return t.replace(/\d{8,}/g, "****").slice(0, 200);
}

/** Tidak pernah melempar. Dipanggil tanpa menunggu agar respons pengguna tidak tertunda. */
export async function laporWaGagal(kode: 502 | 503, ringkas: string): Promise<void> {
  try {
    const now = Date.now(), last = TERAKHIR.get(kode);
    if (last !== undefined && now - last < JEDA) return;
    TERAKHIR.set(kode, now);
    const to = await emailsByJabatan(RE_ALERT);
    if (!to.length) return;
    const waktu = new Date(now).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    await kirimEmail(to, "[e-PKK] Pengiriman WhatsApp gagal", [
      "Pengiriman WhatsApp dari e-PKK gagal karena masalah sistem.",
      "",
      `Waktu: ${waktu} WIB`,
      `Kode status: ${kode}`,
      `Penyebab: ${ARTI[kode]}`,
      `Keterangan: ${bersih(ringkas)}`,
      "",
      "Pesan WA (kode OTP, kirim WA admin, permintaan persetujuan) tidak terkirim sampai ini diperbaiki. Email ini dikirim paling banyak satu kali per jam untuk jenis gagal yang sama.",
    ].join("\n"));
  } catch (e) { console.error("laporWaGagal", (e as Error)?.message); }
}
