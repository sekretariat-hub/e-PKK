// Email peringatan ke Sekretaris, Koordinator BPK, dan Sekjen bila pengiriman WhatsApp gagal karena sistem (502/503).
// Dibatasi satu email per jam per kode supaya kotak masuk tidak penuh saat gateway mati. Tidak pernah melempar.
import { kirimEmail } from "./mail";
import { emailsByJabatan, RE_ALERT } from "./penerima";

const JEDA_MS = 3_600_000;
const terakhir = new Map<number, number>();

/** Buang API key dan samarkan nomor panjang (6281****842) sebelum masuk email. */
function bersihkan(s: string): string {
  let t = String(s ?? "");
  const key = process.env.BABLAST_API_KEY;
  if (key) t = t.split(key).join("***");
  return t.replace(/\d{8,}/g, (d) => d.slice(0, 4) + "****" + d.slice(-3)).slice(0, 300);
}

const wib = (ms: number) => new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";

export async function laporWaGagal(kode: 502 | 503, ringkas: string): Promise<void> {
  const sekarang = Date.now();
  const t = terakhir.get(kode);
  if (t !== undefined && sekarang - t < JEDA_MS) return;
  terakhir.set(kode, sekarang); // pesan jatah dulu supaya panggilan bersamaan tidak mengirim dobel
  try {
    const to = await emailsByJabatan(RE_ALERT);
    if (!to.length) { terakhir.delete(kode); console.error("laporWaGagal: tidak ada penerima peringatan"); return; }
    const jenis = kode === 503 ? "belum dikonfigurasi (API key kosong)" : "layanan BaBlast gagal atau tidak menjawab";
    const ok = await kirimEmail(to, "[e-PKK] Pengiriman WhatsApp gagal", [
      "Sistem WhatsApp e-PKK gagal mengirim pesan dan perlu dicek.",
      "",
      `Waktu: ${wib(sekarang)}`,
      `Kode: ${kode} (${jenis})`,
      `Keterangan: ${bersihkan(ringkas)}`,
      "",
      "Yang perlu dicek: API key dan sender BaBlast di dashboard BaBlast, lalu variabel BABLAST_* di server e-PKK.",
      "Email ini dikirim paling banyak sekali per jam per jenis kegagalan.",
    ].join("\n"));
    if (!ok) terakhir.delete(kode);
  } catch (e) {
    terakhir.delete(kode);
    console.error("laporWaGagal", (e as Error).message);
  }
}
