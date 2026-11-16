import { it, expect, vi, beforeEach } from "vitest";

const KEY = "KUNCI-RAHASIA-TES-123";
beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); delete process.env.BABLAST_API_KEY; delete process.env.BABLAST_SENDER_CODE; delete process.env.BABLAST_API_URL; process.env.AIRTABLE_TOKEN = "x"; });

it("kirimWa: tanpa API key ditolak 503 dan tidak memanggil jaringan", async () => {
  const f = vi.fn(); vi.stubGlobal("fetch", f);
  const { kirimWa } = await import("@/lib/wa");
  await expect(kirimWa("628157005842", "halo")).rejects.toMatchObject({ status: 503, message: expect.stringMatching(/belum diaktifkan/) });
  expect(f).not.toHaveBeenCalled();
});

it("kirimWa: nomor tidak valid ditolak 400", async () => {
  process.env.BABLAST_API_KEY = KEY;
  const f = vi.fn(); vi.stubGlobal("fetch", f);
  const { kirimWa } = await import("@/lib/wa");
  await expect(kirimWa("123", "halo")).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Nomor WA/) });
  expect(f).not.toHaveBeenCalled();
});

it("kirimWa: memanggil POST /send dengan Bearer, phone 62..., dan sender_code bila diisi", async () => {
  process.env.BABLAST_API_KEY = KEY; process.env.BABLAST_SENDER_CODE = "SND-ABC123";
  const f = vi.fn(async () => new Response(JSON.stringify({ status: true }), { status: 200 })); vi.stubGlobal("fetch", f);
  const { kirimWa } = await import("@/lib/wa");
  await kirimWa("08157005842", "halo");
  const [url, init] = f.mock.calls[0] as any;
  expect(url).toBe("https://api.bablast.id/send");
  expect(init.method).toBe("POST");
  expect(init.headers.Authorization).toBe("Bearer " + KEY);
  expect(JSON.parse(init.body)).toEqual({ phone: "628157005842", message: "halo", sender_code: "SND-ABC123" });
});

it("kirimWa: respons gagal menjadi 502 tanpa membocorkan API key", async () => {
  process.env.BABLAST_API_KEY = KEY;
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ message: "Sender tidak aktif " + KEY }), { status: 400 }));
  const { kirimWa } = await import("@/lib/wa");
  const e: any = await kirimWa("628157005842", "halo").catch((x) => x);
  expect(e.status).toBe(502);
  expect(e.message).toMatch(/Gagal mengirim WA/);
  expect(e.message).not.toContain(KEY);
});

const TU = "tbls2nQ3hW5rEIZUk", TM = "tblwRNtXSVzgzVXuk";
const user = (o: any = {}) => ({ id: "recUSER0000000001", fields: { fldXCAPjc4bPkTbSq: "ani@x.com", fldR7uM68NdmjWJdK: "Ani Test", fldRiPREBGEFPsyjW: "Disetujui", fldvlRQXDZJdIIcw8: "View", fldgMD37Bgpg1ZdW6: ["Dashboard"], fldf0NRl2Ts4kVxKr: ["recUMAT0000000001"], ...o } });
function mock(u: any, wa: any = "0815-7005-842") {
  const calls: any[] = [];
  vi.stubGlobal("fetch", async (url: any, init: any) => {
    const s = String(url); calls.push([s, init]);
    if (s.startsWith("https://api.bablast.id")) return new Response(JSON.stringify({ ok: 1 }), { status: 200 });
    if (s.includes(`/${TU}/rec`)) return new Response(JSON.stringify(u), { status: 200 });
    if (s.includes(`/${TM}/rec`)) return new Response(JSON.stringify({ id: "recUMAT0000000001", fields: wa === null ? {} : { fldzY1Z2QvIIEkYXR: wa } }), { status: 200 });
    return new Response(JSON.stringify({ records: [] }), { status: 200 });
  });
  return calls;
}

it("adminCall kirimwa: Superadmin mengirim instruksi login ke nomor umat terkait", async () => {
  process.env.BABLAST_API_KEY = KEY;
  const calls = mock(user());
  const { adminCall } = await import("@/lib/admin");
  const r: any = await adminCall("kirimwa", { id: "recUSER0000000001" }, "boss@x.com", { level: "Superadmin", tabs: [] });
  expect(r.ok).toBe(true);
  expect(JSON.stringify(r)).not.toContain("628157005842");
  const send = calls.find((c) => String(c[0]).startsWith("https://api.bablast.id"));
  const body = JSON.parse(send[1].body);
  expect(body.phone).toBe("628157005842");
  expect(body.message).toContain("Cara masuk");
  expect(body.message).toContain("ani@x.com");
});

it("adminCall kirimwa: Admin hanya boleh ke pengguna View; ke level Edit ditolak 403", async () => {
  process.env.BABLAST_API_KEY = KEY;
  const calls = mock(user({ fldvlRQXDZJdIIcw8: "Edit" }));
  const { adminCall } = await import("@/lib/admin");
  await expect(adminCall("kirimwa", { id: "recUSER0000000001" }, "adm@x.com", { level: "Admin", tabs: ["Dashboard"] })).rejects.toMatchObject({ status: 403 });
  expect(calls.some((c) => String(c[0]).startsWith("https://api.bablast.id"))).toBe(false);
});

it("adminCall kirimwa: ditolak bila id salah, status belum Disetujui, atau nomor WA tidak ada", async () => {
  process.env.BABLAST_API_KEY = KEY;
  const sa = { level: "Superadmin", tabs: [] };
  mock(user());
  let { adminCall } = await import("@/lib/admin");
  await expect(adminCall("kirimwa", { id: "bukan-id" }, "b@x.com", sa)).rejects.toMatchObject({ status: 400 });
  vi.resetModules(); mock(user({ fldRiPREBGEFPsyjW: "Menunggu" }));
  ({ adminCall } = await import("@/lib/admin"));
  await expect(adminCall("kirimwa", { id: "recUSER0000000001" }, "b@x.com", sa)).rejects.toThrow(/disetujui/i);
  vi.resetModules(); mock(user(), null);
  ({ adminCall } = await import("@/lib/admin"));
  await expect(adminCall("kirimwa", { id: "recUSER0000000001" }, "b@x.com", sa)).rejects.toThrow(/nomor WA/i);
});

it("adminCall kirimwa: klik ganda dalam 60 detik ke pengguna yang sama ditolak 429", async () => {
  process.env.BABLAST_API_KEY = KEY;
  const calls = mock(user());
  const { adminCall } = await import("@/lib/admin");
  const sa = { level: "Superadmin", tabs: [] };
  await adminCall("kirimwa", { id: "recUSER0000000001" }, "b@x.com", sa);
  await expect(adminCall("kirimwa", { id: "recUSER0000000001" }, "b@x.com", sa)).rejects.toMatchObject({ status: 429 });
  expect(calls.filter((c) => String(c[0]).startsWith("https://api.bablast.id")).length).toBe(1);
});

it("UI Administrasi: kartu pengguna Disetujui punya tombol Kirim WA dengan konfirmasi klik dua kali", async () => {
  const { ADMIN_JS } = await import("@/ui/admin-js");
  expect(ADMIN_JS).toContain('text: "Kirim WA"');
  expect(ADMIN_JS).toContain('api("kirimwa", { id: u.id })');
  expect(ADMIN_JS).toContain("Klik lagi untuk kirim WA");
});

it("UI form login: kolom password punya tombol mata untuk melihat/menyembunyikan", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("src/app/masuk/FormWa.tsx", "utf8");
  expect(src).toContain("Tampilkan password");
  expect(src).toContain("Sembunyikan password");
  expect(src).toMatch(/type=\{lihat \? "text" : "password"\}/);
});
