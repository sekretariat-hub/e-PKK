// Satu pintu untuk permintaan persetujuan: lonceng di dashboard + WA pribadi ke tiap pemutus.
// Kegagalan WA satu penerima tidak membatalkan permintaan maupun WA penerima lain. Nomor tidak pernah dicatat ke log.
import { buatNotif } from "./notif";
import { kirimWa } from "./wa";
import { nomorWaOf } from "./penerima";

export type JenisApproval = "user" | "proker" | "luar-kota" | "sep";
const JEDA_ULANG = 60_000;
const TERAKHIR = new Map<string, number>();

/** Jeda kecil acak antar penerima agar WA tidak terkirim beruntun (mengurangi risiko nomor sender diblokir). */
export const jedaAntarKirim = { ms: () => 300 + Math.floor(Math.random() * 900) };
const tidur = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());

export async function mintaApproval(o: { jenis: JenisApproval; penerima: string[]; pesan: string; tautan: string; url: string }): Promise<{ wa: number; tanpaNomor: number; gagal: number }> {
  const hasil = { wa: 0, tanpaNomor: 0, gagal: 0 };
  const penerima = [...new Set((o.penerima || []).map((e) => (e || "").trim().toLowerCase()).filter(Boolean))];
  if (!penerima.length) return hasil;
  await buatNotif(penerima, o.pesan, o.tautan);
  const isi = `${o.pesan}\n\n${o.url}`;
  const now = Date.now();
  for (const [k, t] of TERAKHIR) if (now - t > JEDA_ULANG) TERAKHIR.delete(k);
  let pertama = true;
  for (const email of penerima) {
    try {
      const kunci = `${o.jenis}|${email}|${o.pesan}`;
      const t = TERAKHIR.get(kunci);
      if (t !== undefined && Date.now() - t < JEDA_ULANG) continue; // klik ganda: jangan kirim dobel
      const nomor = await nomorWaOf(email);
      if (!nomor) { hasil.tanpaNomor++; continue; }
      TERAKHIR.set(kunci, Date.now());
      if (!pertama) await tidur(jedaAntarKirim.ms());
      pertama = false;
      await kirimWa(nomor, isi);
      hasil.wa++;
    } catch (e: any) {
      hasil.gagal++;
      console.error("mintaApproval: WA gagal", o.jenis, e?.status || "");
    }
  }
  return hasil;
}
