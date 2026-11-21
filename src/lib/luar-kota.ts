// WA ke Sekretaris Jenderal saat ada permohonan pewarta luar kota baru (jadwal di base SMP).
// Dipicu webhook dari automation Airtable. Dedup lewat catatan di tabel Notifikasi (Tautan = "luar:<id>"), tanpa field baru.
import { BASE_BPK, BASE_SMP, HttpError, T } from "./policy";
import { getRecord, listPage } from "./airtable";
import { T_NOTIF, NT } from "./proker-schema";
import { emailsWhere } from "./proker-roles";
import { mintaApproval } from "./minta-approval";
import { appUrl } from "./mail";

const REC = /^rec[A-Za-z0-9]{14}$/;
const EV = { nama: "fldQEDVuqLDDDSSex", nama2: "fldmgPwKTRjNtnAyL", tgl: "fldFJ1CisvUveU2cM", pd: "flddzhNZ23pbUSuEk", asal: "fldqjU4a9td4dSeL5", hapus: "fldhLU1ca1XQz9jzr", acc: "fld90EYItgFfqDNn7" };
const sel = (v: any) => String(typeof v === "object" && v && !Array.isArray(v) ? v.name ?? "" : v ?? "").trim();
const first = (v: any) => (Array.isArray(v) ? sel(v[0]) : sel(v));
const jalan = new Set<string>();

export async function notifLuarKota(eventId: string): Promise<{ terkirim: boolean }> {
  if (!REC.test(eventId || "")) throw new HttpError(400, "eventId tidak valid.");
  if (jalan.has(eventId)) return { terkirim: false }; // panggilan serentak untuk id yang sama
  jalan.add(eventId);
  try {
    const f = (await getRecord(BASE_SMP, T.smpEvents, eventId)).fields || {};
    const asal = sel(f[EV.asal]);
    const luar = !!asal && asal !== "BPK Bandung";
    if (!luar || f[EV.hapus] === true || (Array.isArray(f[EV.acc]) && f[EV.acc].length)) return { terkirim: false };
    const tautan = `luar:${eventId}`;
    const ada = await listPage(BASE_BPK, T_NOTIF, { fieldIds: [NT.tautan], pageSize: 1, formula: `{Tautan}="${tautan}"` });
    if (ada.records.length) return { terkirim: false }; // sudah pernah diberi tahu
    const nama = first(f[EV.nama]) || first(f[EV.nama2]) || "Pewarta";
    const pd = first(f[EV.pd]), tgl = String(f[EV.tgl] || "").slice(0, 10);
    await mintaApproval({
      jenis: "luar-kota", penerima: await emailsWhere((r) => r.sekjen),
      pesan: `Permohonan pewarta luar kota menunggu persetujuan Anda: ${nama}${pd ? ` (${pd})` : ""}, ${tgl}.`,
      tautan, url: `${appUrl()}/dashboard?tab=luar`,
    });
    return { terkirim: true };
  } finally { jalan.delete(eventId); }
}
