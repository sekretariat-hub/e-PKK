// Pengiriman WhatsApp lewat BaBlast (server saja). API key hanya dari environment variable, tidak pernah ke browser atau log.
import { HttpError } from "./policy";
import { waDigits } from "./absen";
import { laporWaGagal } from "./wa-alert";

const URL_DEFAULT = "https://api.bablast.id/send";

/** Peringatan tidak boleh menunda atau menggagalkan pengirim; kegagalannya ditelan. */
const lapor = (kode: 502 | 503, ringkas: string) => { laporWaGagal(kode, ringkas).catch(() => {}); };

/** Kirim satu pesan teks. Melempar HttpError: 503 (belum dikonfigurasi), 400 (nomor tidak valid), 502 (BaBlast gagal). */
export async function kirimWa(nomor: string, pesan: string): Promise<void> {
  const key = process.env.BABLAST_API_KEY;
  if (!key) { lapor(503, "BABLAST_API_KEY belum diisi di server."); throw new HttpError(503, "Pengiriman WA otomatis belum diaktifkan (BABLAST_API_KEY belum diisi di server)."); }
  const phone = waDigits(nomor);
  if (!phone) throw new HttpError(400, "Nomor WA tidak valid.");
  const body: Record<string, string> = { phone, message: pesan };
  if (process.env.BABLAST_SENDER_CODE) body.sender_code = process.env.BABLAST_SENDER_CODE;
  let r: Response;
  try {
    r = await fetch(process.env.BABLAST_API_URL || URL_DEFAULT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    lapor(502, "Layanan BaBlast tidak menjawab (timeout atau jaringan).");
    throw new HttpError(502, "Gagal mengirim WA: layanan BaBlast tidak menjawab.");
  }
  if (!r.ok) {
    const txt = (await r.text().catch(() => "")).split(key).join("***");
    let detail = txt.slice(0, 160);
    try { const j = JSON.parse(txt); detail = String(j?.message || j?.error || detail).slice(0, 160); } catch {}
    lapor(502, `BaBlast membalas status ${r.status}: ${detail || "tanpa keterangan"}`);
    throw new HttpError(502, `Gagal mengirim WA (${r.status}): ${detail || "tanpa keterangan"}`);
  }
}
