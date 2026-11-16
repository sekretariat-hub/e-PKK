// Login dengan nomor WhatsApp: OTP 4 digit lewat WA, lalu buat/reset password. Server saja.
// Pengguna lama dicocokkan lewat data umat tertaut; nomor baru membuat akun "Menunggu" (email penanda <62..>@wa.epkk).
import crypto from "node:crypto";
import { BASE_BPK, HttpError, T } from "./policy";
import { at, listPage, listUntil, Rec } from "./airtable";
import { AF, invalidateAccess } from "./access";
import { waDigits } from "./absen";
import { kirimWa } from "./wa";
import { notifySuperadmins } from "./mail";

/** Field baru di tabel Pengguna Dashboard (dilaporkan ke pemilik). */
export const LF = { wa: "fldX4v2X3uwsho2G6", pw: "fldTGVgX98CqWQb2I", otp: "fld7fYvuE959DhGyN" };
const UMAT = { nama: "fldIpQTSkFB9sU0lo", wa: "fldzY1Z2QvIIEkYXR" };
const OTP_MENIT = 10, MAKS_SALAH = 5, JEDA_KIRIM_MS = 60_000, MAKS_KIRIM_JAM = 5, MAKS_GAGAL_LOGIN = 5, KUNCI_MENIT = 15, MAKS_KIRIM_INSTANCE_JAM = 60;

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new HttpError(500, "AUTH_SECRET belum diatur di server.", "upstream_error");
  return s;
};
const hmac = (s: string) => crypto.createHmac("sha256", secret()).update(s).digest();
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sama = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const wajibWa = (nomor: string) => { const wa = waDigits(nomor); if (!wa) throw new HttpError(400, "Nomor WA tidak valid."); return wa; };

/* ---------- password ---------- */
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  return `s1$${b64(salt)}$${b64(crypto.scryptSync(pw, salt, 32))}`;
}
export function cocokPassword(pw: string, simpan: string): boolean {
  const [v, s, h] = String(simpan || "").split("$");
  if (v !== "s1" || !s || !h) return false;
  return sama(b64(crypto.scryptSync(pw, Buffer.from(s, "base64url"), 32)), h);
}

/* ---------- pencarian pengguna ---------- */
type Cari = { rec?: Rec; umatId?: string; umatNama?: string };
async function cariPengguna(wa: string): Promise<Cari> {
  const { records } = await listUntil(BASE_BPK, T.pengguna, { fieldIds: [...Object.values(AF), LF.wa, LF.pw, LF.otp], want: 5000 });
  const langsung = records.find((r) => r.fields[LF.wa] === wa);
  if (langsung) return { rec: langsung };
  const f = `RIGHT(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE({${UMAT.wa}},"-","")," ",""),"+",""),"(",""),9)="${wa.slice(-9)}"`;
  const um = (await listPage(BASE_BPK, T.umat, { fieldIds: [UMAT.wa, UMAT.nama], pageSize: 20, formula: f })).records.filter((u) => waDigits(u.fields[UMAT.wa]) === wa);
  if (!um.length) return {};
  const ids = new Set(um.map((u) => u.id));
  const rec = records.find((r) => ((r.fields[AF.umat] as string[]) || []).some((i) => ids.has(i)));
  return { rec, umatId: um[0].id, umatNama: String(um[0].fields[UMAT.nama] || "") };
}
const patch = (id: string, fields: Record<string, any>) => at(`/v0/${BASE_BPK}/${T.pengguna}`, { method: "PATCH", body: JSON.stringify({ records: [{ id, fields }] }) });

/* ---------- status OTP ---------- */
type St = { h?: string; exp?: number; tries?: number; sent?: number[]; ver?: boolean; fail?: number; lock?: number };
const baca = (r?: Rec): St => { try { return JSON.parse(String(r?.fields[LF.otp] || "{}")) || {}; } catch { return {}; } };
const tulis = (r: Rec, s: St) => patch(r.id, { [LF.otp]: JSON.stringify(s) });
// Nomor yang belum punya baris: kode diturunkan dari HMAC (tanpa penyimpanan), percobaan dibatasi di memori instance.
const mem = new Map<string, { sent: number[]; tries: number }>();
const global: number[] = [];
const bucket = (t: number) => Math.floor(t / (OTP_MENIT * 60_000));
const kodeBaru = (wa: string, b: number) => String(hmac(`otp|${wa}|${b}`).readUInt32BE(0) % 10000).padStart(4, "0");
const hashKode = (wa: string, kode: string) => b64(hmac(`otp|${wa}|${kode}`));

/** Status nomor: "baru" (belum ada akun), "belum_password" (ada akun, belum pernah buat password), "ada". */
export async function cekNomor(nomor: string) {
  const wa = wajibWa(nomor);
  const { rec } = await cariPengguna(wa);
  return { wa, status: !rec ? "baru" : rec.fields[LF.pw] ? "ada" : "belum_password" } as { wa: string; status: "baru" | "belum_password" | "ada" };
}

export async function kirimOtp(nomor: string): Promise<void> {
  const wa = wajibWa(nomor), t = Date.now();
  while (global.length && t - global[0] > 3600_000) global.shift();
  if (global.length >= MAKS_KIRIM_INSTANCE_JAM) throw new HttpError(429, "Terlalu banyak permintaan kode. Coba lagi nanti.");
  const { rec } = await cariPengguna(wa);
  const st: St = rec ? baca(rec) : mem.get(wa) ? { sent: mem.get(wa)!.sent } : {};
  const sent = (st.sent || []).filter((x) => t - x < 3600_000);
  if (sent.length && t - sent[sent.length - 1] < JEDA_KIRIM_MS) throw new HttpError(429, "Kode baru saja dikirim. Tunggu satu menit sebelum meminta lagi.");
  if (sent.length >= MAKS_KIRIM_JAM) throw new HttpError(429, "Permintaan kode terlalu sering. Coba lagi dalam satu jam.");
  const kode = rec ? String(crypto.randomInt(0, 10000)).padStart(4, "0") : kodeBaru(wa, bucket(t));
  await kirimWa(wa, `Kode verifikasi e-PKK BPK PKK Bandung: *${kode}*\nBerlaku ${OTP_MENIT} menit. Jangan bagikan kode ini kepada siapa pun.`);
  global.push(t);
  sent.push(t);
  if (rec) await tulis(rec, { ...st, h: hashKode(wa, kode), exp: t + OTP_MENIT * 60_000, tries: 0, sent, ver: false });
  else mem.set(wa, { sent, tries: 0 });
}

/* ---------- token pendek (setelah OTP benar) ---------- */
const buatToken = (p: object) => { const d = b64(JSON.stringify(p)); return d + "." + b64(hmac("tok|" + d)); };
function bukaToken(tok: string): { wa: string; exp: number; mode: "user" | "baru"; fp: string } {
  const [d, s] = String(tok || "").split(".");
  if (!d || !s || !sama(s, b64(hmac("tok|" + d)))) throw new HttpError(400, "Sesi verifikasi tidak valid. Ulangi dari awal.");
  const p = JSON.parse(Buffer.from(d, "base64url").toString());
  if (!p.exp || p.exp < Date.now()) throw new HttpError(400, "Sesi verifikasi sudah habis. Ulangi dari awal.");
  return p;
}

export async function verifOtp(nomor: string, kode: string): Promise<{ token: string }> {
  const wa = wajibWa(nomor), t = Date.now(), k = String(kode || "").trim();
  if (!/^\d{4}$/.test(k)) throw new HttpError(400, "Kode harus 4 digit.");
  const { rec } = await cariPengguna(wa);
  const salah = () => new HttpError(400, "Kode salah atau sudah kedaluwarsa.");
  if (rec) {
    const st = baca(rec);
    if (!st.h || !st.exp || st.exp < t) throw salah();
    if ((st.tries || 0) >= MAKS_SALAH) throw new HttpError(429, "Terlalu banyak percobaan. Minta kode baru.");
    if (!sama(hashKode(wa, k), st.h)) { await tulis(rec, { ...st, tries: (st.tries || 0) + 1 }); throw salah(); }
    await tulis(rec, { ...st, ver: true });
    return { token: buatToken({ wa, exp: t + OTP_MENIT * 60_000, mode: "user", fp: st.h }) };
  }
  const m = mem.get(wa);
  if (!m) throw salah();
  if (m.tries >= MAKS_SALAH) throw new HttpError(429, "Terlalu banyak percobaan. Minta kode baru.");
  const b = bucket(t);
  if (!sama(k, kodeBaru(wa, b)) && !sama(k, kodeBaru(wa, b - 1))) { m.tries++; throw salah(); }
  return { token: buatToken({ wa, exp: t + OTP_MENIT * 60_000, mode: "baru", fp: "" }) };
}

export async function setPassword(token: string, password: string): Promise<{ email: string }> {
  const p = bukaToken(token);
  if (String(password || "").length < 8) throw new HttpError(400, "Password minimal 8 karakter.");
  if (String(password).length > 100) throw new HttpError(400, "Password terlalu panjang.");
  const { rec, umatId, umatNama } = await cariPengguna(p.wa);
  const pw = hashPassword(password), now = new Date().toISOString();
  if (p.mode === "user") {
    const st = rec ? baca(rec) : {};
    if (!rec || !st.h || !st.ver || st.h !== p.fp) throw new HttpError(400, "Sesi verifikasi tidak berlaku lagi. Ulangi dari awal.");
    await patch(rec.id, { [LF.wa]: p.wa, [LF.pw]: pw, [LF.otp]: "" });
    invalidateAccess();
    return { email: String(rec.fields[AF.email] || "") };
  }
  if (rec) throw new HttpError(400, "Sesi verifikasi tidak berlaku lagi. Ulangi dari awal.");
  const email = `${p.wa}@wa.epkk`;
  const fields: Record<string, any> = { [AF.email]: email, [AF.nama]: umatNama || "", [AF.status]: "Menunggu", [AF.level]: "View", [AF.login]: now, [LF.wa]: p.wa, [LF.pw]: pw };
  if (umatId) fields[AF.umat] = [umatId];
  await at(`/v0/${BASE_BPK}/${T.pengguna}`, { method: "POST", body: JSON.stringify({ records: [{ fields }] }) });
  mem.delete(p.wa);
  try { await notifySuperadmins(email, umatNama || "Nomor WA " + p.wa); } catch (e) { console.error("notif email gagal", e); }
  invalidateAccess();
  return { email };
}

/** Dipakai Auth.js Credentials. Gagal => HttpError (401 salah, 403 ditolak, 429 terkunci). */
export async function loginPassword(nomor: string, password: string): Promise<{ email: string; name: string }> {
  const wa = wajibWa(nomor), t = Date.now();
  const { rec } = await cariPengguna(wa);
  const gagal = new HttpError(401, "Nomor atau password salah.");
  if (!rec || !rec.fields[LF.pw]) throw gagal;
  const st = baca(rec);
  if (st.lock && st.lock > t) throw new HttpError(429, "Terlalu banyak percobaan. Coba lagi dalam beberapa menit atau pakai Lupa password.");
  if (!cocokPassword(String(password || ""), String(rec.fields[LF.pw]))) {
    const fail = (st.fail || 0) + 1;
    await tulis(rec, { ...st, fail: fail >= MAKS_GAGAL_LOGIN ? 0 : fail, lock: fail >= MAKS_GAGAL_LOGIN ? t + KUNCI_MENIT * 60_000 : st.lock });
    throw gagal;
  }
  if (rec.fields[AF.status] === "Ditolak") throw new HttpError(403, "Akun ini dinonaktifkan. Hubungi sekretariat.");
  if (st.fail || st.lock) await tulis(rec, { ...st, fail: 0, lock: 0 });
  return { email: String(rec.fields[AF.email] || ""), name: String(rec.fields[AF.nama] || "") };
}
