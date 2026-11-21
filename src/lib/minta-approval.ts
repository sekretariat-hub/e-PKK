// Permintaan persetujuan: lonceng + WhatsApp pribadi ke tiap pemutus, berisi link tindakan. Server saja.
// Tidak pernah melempar: kegagalan WA satu penerima tidak membatalkan permintaannya dan tidak menghentikan penerima lain.
import { buatNotif } from "./notif";
import { kirimWa } from "./wa";
import { emailsByJabatan, nomorWaOf, RE_WA_APPROVAL } from "./penerima";

export type JenisApproval = "user" | "proker" | "luar-kota" | "sep";
export type PermintaanApproval = { jenis: JenisApproval; penerima: string[]; pesan: string; tautan: string; url: string };

const JEDA_ULANG_MS = 60_000;
const terkirim = new Map<string, number>();
const tidur = (ms: number) => new Promise((r) => setTimeout(r, ms));
const acak = (min: number, max: number) => min + Math.floor(Math.random() * (max - min));

/** Hasil: wa = terkirim, tanpaNomor = nomor kosong/tidak valid (lonceng tetap ada), gagal = gateway bermasalah. */
export async function mintaApproval(o: PermintaanApproval): Promise<{ wa: number; tanpaNomor: number; gagal: number }> {
  const hasil = { wa: 0, tanpaNomor: 0, gagal: 0 };
  const norm = (xs: string[]) => [...new Set((xs || []).map((e) => (e || "").trim().toLowerCase()).filter(Boolean))];
  // WA hanya ke pemegang jabatan Ketua Sekretariat; lonceng ke pemutus masing-masing ditambah Ketua Sekretariat.
  let waKe: string[] = [];
  try { waKe = norm(await emailsByJabatan(RE_WA_APPROVAL)); } catch (e: any) { console.error(`mintaApproval ${o.jenis}: penerima WA tidak terbaca`, e?.status ?? ""); }
  const loncengKe = norm([...(o.penerima || []), ...waKe]);
  if (!loncengKe.length) return hasil;

  await buatNotif(loncengKe, o.pesan, o.tautan); // tidak pernah melempar
  const sekarang = Date.now();
  for (const [k, t] of terkirim) if (sekarang - t >= JEDA_ULANG_MS) terkirim.delete(k);

  let pertama = true;
  for (const email of waKe) {
    const kunci = `${o.jenis}|${o.tautan}|${email}`;
    if (terkirim.has(kunci)) continue; // klik/permintaan berulang dalam 60 detik
    try {
      const nomor = await nomorWaOf(email);
      if (!nomor) { hasil.tanpaNomor++; continue; }
      terkirim.set(kunci, sekarang);
      if (!pertama) await tidur(acak(300, 1200)); // jeda kecil antar penerima, mengurangi risiko nomor sender diblokir
      pertama = false;
      await kirimWa(nomor, o.pesan + "\n\n" + o.url);
      hasil.wa++;
    } catch (e: any) {
      if (e?.status === 400) hasil.tanpaNomor++;
      else { hasil.gagal++; terkirim.delete(kunci); console.error(`mintaApproval ${o.jenis}: WA ke penerima gagal (status ${e?.status ?? "?"})`); }
    }
  }
  return hasil;
}
