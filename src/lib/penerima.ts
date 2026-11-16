// Penghitung penerima untuk permintaan persetujuan dan peringatan WA gagal. Server saja.
import { BASE_BPK, T } from "./policy";
import { getRecord, listUntil } from "./airtable";
import { AF, jabatanOf } from "./access";

const UMAT_WA = "fldzY1Z2QvIIEkYXR";

/** Penerima WA persetujuan user baru: Sekretariat dan Sekretaris (bukan Sekretaris Jenderal). Dicocokkan per jabatan. */
export const RE_APPROVER_USER = /^(sekretaris|sekretariat|ketua sekretariat|sie sekretaris)$/i;
/** Penerima email peringatan WA gagal: Sekretaris, Sekretaris Jenderal (termasuk ejaan "Jendral"), dan Koordinator BPK. */
export const RE_ALERT = /^(sekretaris|sekretaris jende?ral|koordinator|koordinator bpkpkk bandung)$/i;

type Akun = { email: string; jabatan: string[]; sepPeran: string; umatId: string };
let cache: { at: number; v: Akun[] } | null = null;

async function akunDisetujui(): Promise<Akun[]> {
  if (cache && Date.now() - cache.at < 300_000) return cache.v;
  const { records } = await listUntil(BASE_BPK, T.pengguna, { fieldIds: Object.values(AF), want: 2000, formula: '{Status}="Disetujui"' });
  const v = records.filter((r) => r.fields?.[AF.status] === "Disetujui").map((r) => {
    const f = r.fields || {};
    const u = Array.isArray(f[AF.umat]) ? f[AF.umat][0] : "";
    return {
      email: String(f[AF.email] || "").trim().toLowerCase(),
      jabatan: jabatanOf(f).split(",").map((j) => j.trim()).filter(Boolean),
      sepPeran: String(f[AF.sepPeran] || ""),
      umatId: typeof u === "string" ? u : String(u?.id || ""),
    };
  }).filter((a) => a.email);
  cache = { at: Date.now(), v };
  return v;
}

const unik = (xs: string[]) => [...new Set(xs)];

/** Email akun Disetujui yang salah satu jabatannya cocok dengan re (huruf kecil, tanpa duplikat). */
export async function emailsByJabatan(re: RegExp): Promise<string[]> {
  return unik((await akunDisetujui()).filter((a) => a.jabatan.some((j) => re.test(j))).map((a) => a.email));
}

/** Email akun Disetujui yang berperan Tim SEP BPK. */
export async function emailsTimSep(): Promise<string[]> {
  return unik((await akunDisetujui()).filter((a) => a.sepPeran === "Tim SEP BPK").map((a) => a.email));
}

/** Nomor WA dari data umat yang ditautkan ke akun. "" bila akun tidak dikenal atau tidak punya link umat. */
export async function nomorWaOf(email: string): Promise<string> {
  const e = (email || "").trim().toLowerCase();
  const a = (await akunDisetujui()).find((x) => x.email === e && x.umatId);
  if (!a || !/^rec[A-Za-z0-9]{14}$/.test(a.umatId)) return "";
  try {
    const u = await getRecord(BASE_BPK, T.umat, a.umatId);
    return String(u.fields?.[UMAT_WA] || "");
  } catch (err) { console.error("nomorWaOf", (err as Error).message); return ""; }
}

export function clearPenerimaCache() { cache = null; }
