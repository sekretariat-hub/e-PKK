// Pilihan dan validasi form Edit umat (Superadmin). Opsi select dibaca dari skema Airtable, bukan ditulis ulang di kode.
import { getSchema, listUntil } from "./airtable";
import { BASE_BPK, T } from "./policy";

export type UmatFormMeta = { jk: string[]; libat: string[]; kualifikasi: string[]; alumni: string[]; pd: { id: string; nama: string }[]; paroki: { id: string; nama: string }[] };

const F = { nama: "fldIpQTSkFB9sU0lo", wa: "fldzY1Z2QvIIEkYXR", email: "fldAaQ3zmiLBhp4z9", tgl: "fldXGHvqnezzKZSCp", jk: "fldxpeouH1hcxMzNc", libat: "fldQQpyVKX2eZGokY", kual: "fldwywmGiZMscPgKq", alumni: "fld8wFTduClZ9Y5Al" };

const blank = (v: any) => v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);

/** Pesan kesalahan (Indonesia) atau null bila data lengkap dan benar. */
export function validateUmatFields(f: Record<string, any>): string | null {
  if (blank(f[F.nama])) return "Nama Lengkap wajib diisi.";
  if (blank(f[F.wa])) return "No WhatsApp Aktif wajib diisi.";
  if (blank(f[F.jk])) return "Jenis Kelamin wajib dipilih.";
  if (!blank(f[F.email]) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(f[F.email]).trim())) return "Email tidak valid.";
  if (!blank(f[F.tgl]) && !/^\d{4}-\d{2}-\d{2}$/.test(String(f[F.tgl]))) return "Tanggal Lahir harus berformat tahun-bulan-tanggal.";
  return null;
}

let cache: { at: number; v: Promise<UmatFormMeta> } | null = null;
export function clearUmatFormCache() { cache = null; }

async function names(table: string, primary: string) {
  const { records } = await listUntil(BASE_BPK, table, { fieldIds: [primary], want: Infinity, maxPages: 50 });
  return records
    .map((r) => ({ id: r.id, nama: String(r.fields[primary] ?? "").trim() }))
    .filter((x) => x.nama)
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

export function getUmatFormMeta(): Promise<UmatFormMeta> {
  if (cache && Date.now() - cache.at < 300_000) return cache.v;
  const v = (async () => {
    const sch = await getSchema(BASE_BPK);
    const opts = (id: string): string[] => ((sch[T.umat]?.fields?.[id] as any)?.options?.choices || []).map((c: any) => String(c.name));
    const [pd, paroki] = await Promise.all([
      names(T.pd, sch[T.pd].primaryFieldId),
      names(T.paroki, sch[T.paroki].primaryFieldId),
    ]);
    return { jk: opts(F.jk), libat: opts(F.libat), kualifikasi: opts(F.kual), alumni: opts(F.alumni), pd, paroki };
  })();
  cache = { at: Date.now(), v };
  v.catch(() => { cache = null; });
  return v;
}
