// Permohonan pewarta luar kota: kabar ke Sekjen (lonceng + WA) saat permohonan baru masuk di base SMP.
import { BASE_BPK, BASE_SMP, HttpError, T } from "./policy";
import { getRecord, listPage } from "./airtable";
import { emailsWhere } from "./proker-roles";
import { mintaApproval } from "./minta-approval";
import { appUrl } from "./mail";
import { T_NOTIF, NT } from "./proker-schema";

const SM = { tgl: "fldFJ1CisvUveU2cM", nama: "fldQEDVuqLDDDSSex", nama2: "fldmgPwKTRjNtnAyL", pd: "flddzhNZ23pbUSuEk", asal: "fldqjU4a9td4dSeL5", acc: "fld4hZqPpwywk8yfM", bpk: "fldUrgjrHXaaYqTbk", hapus: "fldhLU1ca1XQz9jzr" };
const REC = /^rec[A-Za-z0-9]{14}$/;
const one = (v: any): string => { const x = Array.isArray(v) ? v[0] : v; return x && typeof x === "object" ? String(x.name || "") : String(x ?? ""); };
const flat = (v: any): string[] => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]).map((x) => (x && typeof x === "object" ? String(x.name || "") : String(x))).filter(Boolean);

/** Aturan "luar kota" sama dengan dashboard: asal pewarta menentukan; ACC surat hanya dipakai bila asal kosong. */
function isLuarKota(f: Record<string, any>): boolean {
  const org = one(f[SM.asal]) || flat(f[SM.bpk]).join(", ");
  return org ? org !== "BPK Bandung" : flat(f[SM.acc]).length > 0;
}

export async function notifLuarKota(eventId: string): Promise<{ terkirim: boolean }> {
  if (!REC.test(eventId || "")) throw new HttpError(400, "id permohonan tidak valid.");
  const ev = await getRecord(BASE_SMP, T.smpEvents, eventId);
  const f = ev.fields || {};
  if (f[SM.hapus] || !isLuarKota(f)) return { terkirim: false };
  const tautan = `luar:${eventId}`;
  // Anti-ganda: Airtable automation bisa memanggil dua kali; permohonan yang sama hanya dikabari sekali.
  const ada = await listPage(BASE_BPK, T_NOTIF, { fieldIds: [NT.tautan], pageSize: 1, formula: `{Tautan}="${tautan}"` });
  if (ada.records.length) return { terkirim: false };
  const nama = one(f[SM.nama]) || one(f[SM.nama2]) || "Pewarta";
  const pd = flat(f[SM.pd]).join(", ") || "-";
  const tgl = one(f[SM.tgl]).slice(0, 10);
  await mintaApproval({
    jenis: "luar-kota", penerima: await emailsWhere((r) => r.sekjen),
    pesan: `Permohonan pewarta luar kota menunggu persetujuan Anda: ${nama} (${pd}), ${tgl}.`,
    tautan, url: `${appUrl()}/dashboard#luar`,
  });
  return { terkirim: true };
}
