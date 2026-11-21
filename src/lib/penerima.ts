// Penghitung penerima persetujuan dan peringatan, dari jabatan akun di "Pengguna Dashboard".
import { BASE_BPK, T } from "./policy";
import { getRecord, listUntil } from "./airtable";
import { AF, jabatanOf } from "./access";

/** Penerima WA untuk user baru: Sekretariat dan Sekretaris (bukan Sekretaris Jenderal). */
export const RE_APPROVER_USER = /^(sekretariat|ketua sekretariat|sekretaris)$/i;
/** Penerima email peringatan WA gagal: Sekretaris, Sekretaris Jenderal, Koordinator BPK. */
export const RE_ALERT = /^(sekretaris|sekretaris jend[ae]ral|koordinator bpkpkk bandung)$/i;

type U = { email: string; jabatan: string[]; sepPeran: string; umat: string };
let cache: { at: number; v: Promise<U[]> } | null = null;

const nameOf = (v: any) => String(typeof v === "object" && v ? v.name ?? "" : v ?? "").trim();

function muat(): Promise<U[]> {
  if (cache && Date.now() - cache.at < 300_000) return cache.v;
  const v = (async (): Promise<U[]> => {
    const { records } = await listUntil(BASE_BPK, T.pengguna, {
      fieldIds: Object.values(AF), want: Infinity, maxPages: 10, formula: '{Status}="Disetujui"',
    });
    return records
      .filter((r) => nameOf(r.fields[AF.status]) === "Disetujui")
      .map((r) => {
        const l = (r.fields[AF.umat] as any[]) || [];
        const first = l[0];
        return {
          email: String(r.fields[AF.email] || "").trim().toLowerCase(),
          jabatan: String(jabatanOf(r.fields)).split(",").map((s: string) => s.trim()).filter(Boolean),
          sepPeran: nameOf(r.fields[AF.sepPeran]),
          umat: typeof first === "string" ? first : first?.id || "",
        };
      })
      .filter((u) => u.email);
  })();
  cache = { at: Date.now(), v };
  v.catch(() => { cache = null; });
  return v;
}

const uniq = (a: string[]) => [...new Set(a)];

/** Email akun Disetujui yang salah satu jabatannya cocok dengan re (huruf kecil, unik). */
export async function emailsByJabatan(re: RegExp): Promise<string[]> {
  return uniq((await muat()).filter((u) => u.jabatan.some((j) => re.test(j))).map((u) => u.email));
}

/** Email akun Disetujui dengan peran SEP "Tim SEP BPK". */
export async function emailsTimSep(): Promise<string[]> {
  return uniq((await muat()).filter((u) => u.sepPeran === "Tim SEP BPK").map((u) => u.email));
}

/** Nomor WA akun (dari data umat yang ditautkan). "" bila tak ada. Tidak pernah dicatat ke log. */
export async function nomorWaOf(email: string): Promise<string> {
  const e = (email || "").trim().toLowerCase();
  const uid = (await muat()).filter((u) => u.email === e).map((u) => u.umat).find((x) => /^rec[A-Za-z0-9]{14}$/.test(x));
  if (!uid) return "";
  try {
    const u = await getRecord(BASE_BPK, T.umat, uid);
    return String(u.fields?.fldzY1Z2QvIIEkYXR || "").trim();
  } catch { return ""; }
}

export function clearPenerimaCache() { cache = null; }
