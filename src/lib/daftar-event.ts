// Pendaftaran peserta event lewat link publik bertanda tangan (HMAC), menggantikan form Fillout.
// Disimpan di tabel Pendaftaran Events yang sudah ada (tanpa tabel/field baru).
import crypto from "node:crypto";
import { BASE_BPK, HttpError, T } from "./policy";
import { at, getRecord, getSchema, listPage, listUntil } from "./airtable";

const REC = /^rec[A-Za-z0-9]{14}$/;
const PD = { event: "flduf15moMpZSklGL", umat: "fldqvA9dTUmWLfRr2", kom: "fldMBf67dQxv51kY1", aktif: "fldiRoeZ0i2j5r9AV", jabatan: "fldXodEfnTDwm4XoI", seksiLain: "fld6LN4ZK9d6K2dfa", st: "fldNGGEcwHqIsQPct" };
const UM = { nama: "fldIpQTSkFB9sU0lo", pgl: "fld469PYR80nAUNIF", wa: "fldzY1Z2QvIIEkYXR", pd: "fldrHJ6q3HZvApccl", pdNama: "fldOovF470MdN2fMg", hapus: "fldxZvnqVvAH4aWyd", wafat: "fldhCRFZpi4cx0zRJ" };
const EV = { nama: "fld0d9tIyi4nyTZsM", tgl: "fldoIkx9wLMaKOa38", buka: "fldvJxqvazI3GQGha", tutup: "fldI1RKkKVaua8DH0", pic: "fldROaJ8rPAZQPTED", telp: "fld4qestIo5EjWAvk" };
const MPD = { nama: "fldcHytxm3KCMCdOO", status: "fldztBjgYsCSWXNpY" };

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new HttpError(500, "AUTH_SECRET belum diatur di server.", "upstream_error");
  return s;
};
const mac = (id: string) => crypto.createHmac("sha256", secret()).update("daftar:" + id).digest("base64url").slice(0, 22);

export function buatTokenDaftar(eventId: string): string {
  if (!REC.test(eventId)) throw new HttpError(400, "Event tidak valid.");
  return eventId + "." + mac(eventId);
}
export function bacaTokenDaftar(token: string): string | null {
  const [id, sig] = String(token || "").split(".");
  if (!id || !sig || !REC.test(id)) return null;
  const a = Buffer.from(mac(id)), b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null;
}

const esc = (s: string) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const one = (v: any) => String(Array.isArray(v) ? v[0] ?? "" : v ?? "").replace(/\s+/g, " ").trim();
const sel = (v: any) => String(typeof v === "object" && v ? v.name ?? "" : v ?? "");
export const normNama = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const aktifSt = (v: any) => !/^(batal|dobel)/i.test(sel(v));

const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const WIB = 7 * 3600_000;
export function tglId(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return isNaN(+d) ? "" : `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function waktuId(iso: string): string {
  const d = new Date(Date.parse(iso) + WIB);
  if (isNaN(+d)) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()}, Pukul ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

async function muatEvent(token: string) {
  const id = bacaTokenDaftar(token);
  if (!id) throw new HttpError(404, "Link pendaftaran tidak valid.");
  const ev = await getRecord(BASE_BPK, T.events, id).catch(() => null);
  if (!ev) throw new HttpError(404, "Event tidak ditemukan.");
  return { id, nama: String(ev.fields[EV.nama] || ""), tgl: String(ev.fields[EV.tgl] || "").slice(0, 10), buka: String(ev.fields[EV.buka] || ""), tutup: String(ev.fields[EV.tutup] || ""), pic: one(ev.fields[EV.pic]), telp: one(ev.fields[EV.telp]) };
}

/** Buka/tutup: pakai TanggalOpen/CloseRegistrasi bila ada; bila tidak ada tutup, berlaku sampai akhir hari acara (WIB). */
export function statusBuka(e: { tgl: string; buka: string; tutup: string }, now = Date.now()): { buka: boolean; alasan: string } {
  const b = e.buka ? Date.parse(e.buka) : NaN;
  if (!isNaN(b) && now < b) return { buka: false, alasan: "Pendaftaran belum dibuka. Dibuka pada " + waktuId(e.buka) + "." };
  const t = e.tutup ? Date.parse(e.tutup) : e.tgl ? Date.parse(e.tgl + "T00:00:00Z") - WIB + 86_400_000 : NaN;
  if (!isNaN(t) && now > t) return { buka: false, alasan: "Pendaftaran sudah ditutup." };
  return { buka: true, alasan: "" };
}

export async function opsiJabatan(): Promise<string[]> {
  const sch = (await getSchema(BASE_BPK))[T.pendaftaran];
  return ((sch?.fields?.[PD.jabatan]?.options?.choices || []) as { name: string }[]).map((c) => c.name);
}

type Pd = { id: string; nama: string };
let pdCache: { at: number; v: Promise<Pd[]> } | null = null;
async function daftarPd(): Promise<Pd[]> {
  if (pdCache && Date.now() - pdCache.at < 300_000) return pdCache.v;
  const v = (async () => {
    const { records } = await listUntil(BASE_BPK, T.pd, { fieldIds: [MPD.nama, MPD.status], want: Infinity, maxPages: 20 });
    return records
      .filter((r) => one(r.fields[MPD.nama]) && !/tidak aktif|non ?aktif|bubar/i.test(sel(r.fields[MPD.status])))
      .map((r) => ({ id: r.id, nama: one(r.fields[MPD.nama]) }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  })();
  pdCache = { at: Date.now(), v };
  v.catch(() => { pdCache = null; });
  return v;
}

export type UmatItem = { id: string; nama: string; pd: string; pgl: string };
let umatCache: { at: number; v: Promise<UmatItem[]> } | null = null;
export const bersihkanCacheUmat = () => { umatCache = null; };
/** Seluruh umat (belum dihapus/wafat), urut abjad. Hanya nama, PD, dan panggilan; tidak ada WA/email. */
async function daftarUmat(): Promise<UmatItem[]> {
  if (umatCache && Date.now() - umatCache.at < 300_000) return umatCache.v;
  const v = (async () => {
    const { records } = await listUntil(BASE_BPK, T.umat, {
      fieldIds: [UM.nama, UM.pgl, UM.pdNama], want: Infinity, maxPages: 200,
      formula: `AND(NOT({${UM.hapus}}), {${UM.wafat}}=BLANK())`,
    });
    return records
      .filter((r) => one(r.fields[UM.nama]))
      .map((r) => ({ id: r.id, nama: one(r.fields[UM.nama]), pd: one(r.fields[UM.pdNama]), pgl: one(r.fields[UM.pgl]) }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id", { sensitivity: "base" }));
  })();
  umatCache = { at: Date.now(), v };
  v.catch(() => { umatCache = null; });
  return v;
}

/** Id umat yang sudah terdaftar aktif di event ini. */
async function umatTerdaftar(ev: { id: string; nama: string }): Promise<Set<string>> {
  const { records } = await listUntil(BASE_BPK, T.pendaftaran, {
    fieldIds: [PD.event, PD.umat, PD.st], want: Infinity, maxPages: 30,
    formula: `FIND("${esc(ev.nama)}", ARRAYJOIN({Event}))`,
  });
  const s = new Set<string>();
  for (const r of records) {
    if (!((r.fields[PD.event] as string[]) || []).includes(ev.id) || !aktifSt(r.fields[PD.st])) continue;
    for (const u of (r.fields[PD.umat] as string[]) || []) s.add(u);
  }
  return s;
}

export async function infoDaftar(token: string) {
  const ev = await muatEvent(token);
  const b = statusBuka(ev);
  return {
    nama: ev.nama.replace(/^\d{6}-/, ""),
    tgl: tglId(ev.tgl),
    tutup: ev.tutup ? waktuId(ev.tutup) : "",
    buka: b.buka,
    alasan: b.alasan,
    kontak: [ev.pic, ev.telp].filter(Boolean).join(" "),
    jabatan: b.buka ? await opsiJabatan() : [],
    pd: b.buka ? await daftarPd() : [],
  };
}

/** Daftar nama untuk tombol +Add: urut abjad; yang sudah terdaftar di event ini ditandai. */
export async function umatUntukEvent(token: string) {
  const ev = await muatEvent(token);
  if (!statusBuka(ev).buka) throw new HttpError(403, "Pendaftaran tidak dibuka.");
  const [semua, ada] = await Promise.all([daftarUmat(), umatTerdaftar(ev)]);
  return { umat: semua.map((u) => ({ id: u.id, nama: u.nama, pd: u.pd, pgl: u.pgl && u.pgl !== u.nama ? u.pgl : "", ada: ada.has(u.id) })) };
}

const hits = new Map<string, number[]>();
export function rateOk(ip: string, max = 20) {
  const now = Date.now(), l = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (l.length >= max) { hits.set(ip, l); return false; }
  l.push(now); hits.set(ip, l); return true;
}

export type Kirim = { umat?: string; baru?: { nama?: string; wa?: string; pd?: string }; aktif?: boolean; jabatan?: string[]; seksiLain?: string; website?: string };

export async function kirimDaftar(token: string, b: Kirim) {
  if (b?.website) return { ok: true }; // honeypot
  const ev = await muatEvent(token);
  const bk = statusBuka(ev);
  if (!bk.buka) throw new HttpError(403, bk.alasan);
  const opsi = await opsiJabatan();
  const jabatan = Array.isArray(b.jabatan) ? [...new Set(b.jabatan.map(String))] : [];
  if (!jabatan.every((j) => opsi.includes(j))) throw new HttpError(400, "Jabatan tidak valid.");
  const seksiLain = String(b.seksiLain || "").replace(/\s+/g, " ").trim().slice(0, 100);

  let umatId = "", pdId = "", nama = "", baru = false;
  if (b.baru) {
    nama = String(b.baru.nama || "").replace(/\s+/g, " ").trim();
    const wa = String(b.baru.wa || "").replace(/[^\d+]/g, "");
    pdId = String(b.baru.pd || "");
    if (nama.length < 3 || nama.length > 120) throw new HttpError(400, "Nama lengkap wajib diisi.");
    if (wa.replace(/\D/g, "").length < 8 || wa.replace(/\D/g, "").length > 15) throw new HttpError(400, "Nomor WhatsApp tidak benar. Contoh: 0812xxxxxxx.");
    if (!REC.test(pdId) || !(await daftarPd()).some((p) => p.id === pdId)) throw new HttpError(400, "Pilih PD/Komunitas dari daftar.");
    // Blokir data ganda: nama yang sama (abaikan huruf besar/kecil dan spasi) tidak boleh dibuat baru.
    const ada = (await daftarUmat()).find((u) => normNama(u.nama) === normNama(nama));
    const cek = ada || (await listPage(BASE_BPK, T.umat, { fieldIds: [UM.nama], pageSize: 1, formula: `LOWER({${UM.nama}})="${esc(nama.toLowerCase())}"` })).records[0];
    if (cek) throw new HttpError(409, "Nama ini sudah ada di data umat. Tutup, lalu cari dan pilih nama Anda dari daftar.");
    const r = await at(`/v0/${BASE_BPK}/${T.umat}`, { method: "POST", body: JSON.stringify({ records: [{ fields: { [UM.nama]: nama, [UM.wa]: wa, [UM.pd]: [pdId] } }] }) });
    umatId = r?.records?.[0]?.id;
    if (!umatId) throw new HttpError(502, "Gagal menyimpan data Anda.", "upstream_error");
    bersihkanCacheUmat();
    baru = true;
  } else {
    umatId = String(b.umat || "");
    if (!REC.test(umatId)) throw new HttpError(400, "Pilih nama Anda dari daftar.");
    const u = await getRecord(BASE_BPK, T.umat, umatId).catch(() => null);
    if (!u || u.fields[UM.hapus]) throw new HttpError(404, "Nama tidak ditemukan.");
    nama = one(u.fields[UM.nama]);
    pdId = ((u.fields[UM.pd] as string[]) || [])[0] || "";
  }
  if ((await umatTerdaftar(ev)).has(umatId)) throw new HttpError(409, `${nama} sudah terdaftar di event ini.`);
  const f: Record<string, any> = { [PD.event]: [ev.id], [PD.umat]: [umatId], [PD.st]: "Daftar", [PD.aktif]: b.aktif === true };
  if (pdId) f[PD.kom] = [pdId];
  if (jabatan.length) f[PD.jabatan] = jabatan;
  if (seksiLain) f[PD.seksiLain] = seksiLain;
  const r = await at(`/v0/${BASE_BPK}/${T.pendaftaran}`, { method: "POST", body: JSON.stringify({ records: [{ fields: f }] }) });
  if (!r?.records?.[0]?.id) throw new HttpError(502, "Gagal menyimpan pendaftaran.", "upstream_error");
  return { ok: true, nama, baru };
}
