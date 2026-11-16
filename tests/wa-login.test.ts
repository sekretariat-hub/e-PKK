import { it, expect, vi, beforeEach } from "vitest";

const TU = "tbls2nQ3hW5rEIZUk", TM = "tblwRNtXSVzgzVXuk";
const F = { email: "fldXCAPjc4bPkTbSq", nama: "fldR7uM68NdmjWJdK", status: "fldRiPREBGEFPsyjW", level: "fldvlRQXDZJdIIcw8", umat: "fldf0NRl2Ts4kVxKr", wa: "fldX4v2X3uwsho2G6", pw: "fldTGVgX98CqWQb2I", otp: "fld7fYvuE959DhGyN" };
let pengguna: any[]; let umat: any[]; let sent: { phone: string; message: string }[]; let nextId: number;

beforeEach(() => {
  vi.resetModules(); vi.unstubAllGlobals();
  process.env.AUTH_SECRET = "rahasia-tes"; process.env.AIRTABLE_TOKEN = "x"; process.env.BABLAST_API_KEY = "k";
  delete process.env.SMTP_USER;
  pengguna = []; umat = []; sent = []; nextId = 1;
  vi.stubGlobal("fetch", async (url: any, init: any = {}) => {
    const s = String(url), m = init.method || "GET";
    if (s.startsWith("https://api.bablast.id")) { sent.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); }
    if (s.includes(`/${TU}`)) {
      if (m === "GET") return new Response(JSON.stringify({ records: pengguna }), { status: 200 });
      const b = JSON.parse(init.body);
      if (m === "POST") { const r = { id: "recNEW" + String(nextId++).padStart(11, "0"), fields: b.records[0].fields }; pengguna.push(r); return new Response(JSON.stringify({ records: [r] }), { status: 200 }); }
      if (m === "PATCH") { for (const u of b.records) Object.assign(pengguna.find((p) => p.id === u.id).fields, u.fields); return new Response(JSON.stringify({ records: b.records }), { status: 200 }); }
    }
    if (s.includes(`/${TM}`)) return new Response(JSON.stringify({ records: umat }), { status: 200 });
    return new Response(JSON.stringify({ records: [] }), { status: 200 });
  });
});

const kode = () => (sent.at(-1)!.message.match(/\b(\d{4})\b/) || [])[1];
const NO = "08157005842", WA = "628157005842";

it("cek: nomor tak dikenal -> baru; tidak ada baris dibuat", async () => {
  const L = await import("@/lib/wa-login");
  expect(await L.cekNomor(NO)).toEqual({ wa: WA, status: "baru" });
  expect(pengguna.length).toBe(0);
});

it("cek: nomor valid tapi format salah ditolak 400", async () => {
  const L = await import("@/lib/wa-login");
  await expect(L.cekNomor("123")).rejects.toMatchObject({ status: 400 });
});

it("pendaftaran baru: OTP 4 digit dikirim lewat WA, verifikasi, buat password, akun Menunggu dibuat", async () => {
  const L = await import("@/lib/wa-login");
  await L.kirimOtp(NO);
  expect(sent[0].phone).toBe(WA);
  expect(kode()).toMatch(/^\d{4}$/);
  const { token } = await L.verifOtp(NO, kode()!);
  const r = await L.setPassword(token, "rahasia123");
  expect(r.email).toBe(`${WA}@wa.epkk`);
  expect(pengguna.length).toBe(1);
  expect(pengguna[0].fields[F.status]).toBe("Menunggu");
  expect(pengguna[0].fields[F.level]).toBe("View");
  expect(pengguna[0].fields[F.wa]).toBe(WA);
  expect(pengguna[0].fields[F.pw]).toMatch(/^s1\$/);
  expect(pengguna[0].fields[F.pw]).not.toContain("rahasia123");
  expect((await L.loginPassword(NO, "rahasia123")).email).toBe(`${WA}@wa.epkk`);
});

it("OTP salah ditolak; setelah 5 kali salah kode lama tidak berlaku lagi", async () => {
  const L = await import("@/lib/wa-login");
  await L.kirimOtp(NO);
  const benar = kode()!, salah = benar === "0000" ? "1111" : "0000";
  for (let i = 0; i < 5; i++) await expect(L.verifOtp(NO, salah)).rejects.toMatchObject({ status: 400 });
  await expect(L.verifOtp(NO, benar)).rejects.toMatchObject({ status: 429 });
});

it("kirim OTP dua kali dalam 60 detik ditolak 429", async () => {
  const L = await import("@/lib/wa-login");
  await L.kirimOtp(NO);
  await expect(L.kirimOtp(NO)).rejects.toMatchObject({ status: 429 });
  expect(sent.length).toBe(1);
});

it("password kurang dari 8 karakter ditolak", async () => {
  const L = await import("@/lib/wa-login");
  await L.kirimOtp(NO);
  const { token } = await L.verifOtp(NO, kode()!);
  await expect(L.setPassword(token, "pendek")).rejects.toMatchObject({ status: 400 });
});

it("token buatan/rusak ditolak", async () => {
  const L = await import("@/lib/wa-login");
  await expect(L.setPassword("ngawur.token", "rahasia123")).rejects.toMatchObject({ status: 400 });
});

const adaUser = (extra: any = {}) => pengguna.push({ id: "recUSER0000000001", fields: { [F.email]: "ani@x.com", [F.nama]: "Ani", [F.status]: "Disetujui", [F.level]: "Edit", ...extra } });

it("nomor milik pengguna lama (lewat umat tertaut) memakai akun yang sama; email lama tetap", async () => {
  umat.push({ id: "recUMAT0000000001", fields: { fldzY1Z2QvIIEkYXR: "0815-7005-842", fldIpQTSkFB9sU0lo: "Ani" } });
  adaUser({ [F.umat]: ["recUMAT0000000001"] });
  const L = await import("@/lib/wa-login");
  expect(await L.cekNomor(NO)).toEqual({ wa: WA, status: "belum_password" });
  await L.kirimOtp(NO);
  const { token } = await L.verifOtp(NO, kode()!);
  const r = await L.setPassword(token, "rahasia123");
  expect(r.email).toBe("ani@x.com");
  expect(pengguna.length).toBe(1);
  expect(pengguna[0].fields[F.wa]).toBe(WA);
  expect(pengguna[0].fields[F.level]).toBe("Edit");
  expect(await L.cekNomor(NO)).toEqual({ wa: WA, status: "ada" });
});

it("login password salah ditolak 401 dan terkunci setelah 5 kali gagal", async () => {
  adaUser({ [F.wa]: WA });
  const L = await import("@/lib/wa-login");
  await L.kirimOtp(NO);
  const { token } = await L.verifOtp(NO, kode()!);
  await L.setPassword(token, "rahasia123");
  for (let i = 0; i < 5; i++) await expect(L.loginPassword(NO, "salah-salah")).rejects.toMatchObject({ status: 401 });
  await expect(L.loginPassword(NO, "rahasia123")).rejects.toMatchObject({ status: 429 });
});

it("lupa password: OTP lalu password baru menggantikan yang lama", async () => {
  adaUser({ [F.wa]: WA });
  const L = await import("@/lib/wa-login");
  await L.kirimOtp(NO); let v = await L.verifOtp(NO, kode()!); await L.setPassword(v.token, "lama-12345");
  vi.useFakeTimers(); vi.setSystemTime(Date.now() + 120_000);
  await L.kirimOtp(NO); v = await L.verifOtp(NO, kode()!); await L.setPassword(v.token, "baru-67890");
  await expect(L.loginPassword(NO, "lama-12345")).rejects.toMatchObject({ status: 401 });
  expect((await L.loginPassword(NO, "baru-67890")).email).toBe("ani@x.com");
  vi.useRealTimers();
});

it("token set-password hanya berlaku sekali", async () => {
  adaUser({ [F.wa]: WA });
  const L = await import("@/lib/wa-login");
  await L.kirimOtp(NO); const v = await L.verifOtp(NO, kode()!);
  await L.setPassword(v.token, "rahasia123");
  await expect(L.setPassword(v.token, "yang-lain-123")).rejects.toMatchObject({ status: 400 });
});

it("pengguna berstatus Ditolak tidak bisa login", async () => {
  adaUser({ [F.wa]: WA, [F.status]: "Ditolak" });
  const L = await import("@/lib/wa-login");
  await L.kirimOtp(NO); const v = await L.verifOtp(NO, kode()!);
  await L.setPassword(v.token, "rahasia123");
  await expect(L.loginPassword(NO, "rahasia123")).rejects.toMatchObject({ status: 403 });
});

it("route /api/wa-login: perintah tak dikenal 400, nomor tak valid 400, cek berhasil", async () => {
  const { POST } = await import("@/app/api/wa-login/route");
  const req = (b: any) => new Request("http://x/api/wa-login", { method: "POST", body: JSON.stringify(b), headers: { "x-forwarded-for": "9.9.9.9" } });
  expect((await POST(req({ action: "ngawur" }))).status).toBe(400);
  expect((await POST(req({ action: "cek", wa: "12" }))).status).toBe(400);
  const ok = await POST(req({ action: "cek", wa: NO }));
  expect(await ok.json()).toEqual({ wa: WA, status: "baru" });
});
