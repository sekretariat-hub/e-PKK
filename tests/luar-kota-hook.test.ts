import { it, expect, vi, beforeEach } from "vitest";

const minta = vi.hoisted(() => vi.fn(async (_o: any) => ({ wa: 1, tanpaNomor: 0, gagal: 0 })));
vi.mock("../src/lib/minta-approval", () => ({ mintaApproval: minta }));
vi.mock("../src/lib/proker-roles", () => ({ emailsWhere: async () => ["sj@x.com"] }));
vi.mock("../src/lib/mail", () => ({ appUrl: () => "https://e.example" }));

const EID = "recEVENT000000001";
let ev: any, notifRows: any[];
beforeEach(() => {
  vi.resetModules(); minta.mockReset(); minta.mockResolvedValue({ wa: 1, tanpaNomor: 0, gagal: 0 });
  process.env.AIRTABLE_TOKEN = "x"; process.env.HOOK_SECRET = "rahasia-hook-123";
  notifRows = [];
  ev = { id: EID, fields: { fldQEDVuqLDDDSSex: "Pak Budi", fldFJ1CisvUveU2cM: "2026-12-05", flddzhNZ23pbUSuEk: ["PD Santa Maria"], fldqjU4a9td4dSeL5: "BPK Surabaya" } };
  vi.stubGlobal("fetch", async (u: any, init: any = {}) => {
    const url = String(u), method = init.method || "GET";
    if (url.includes("tbll71vbqU6JbmrJq")) return new Response(JSON.stringify(ev), { status: 200 });
    if (url.includes("tbltOykEIlKWAPhGL") && method === "GET") return new Response(JSON.stringify({ records: notifRows }), { status: 200 });
    return new Response("{}", { status: 200 });
  });
});
const req = (body: any, secret?: string) => new Request("https://e.example/api/hook/luar-kota", { method: "POST", headers: { "content-type": "application/json", ...(secret ? { "x-webhook-secret": secret } : {}) }, body: JSON.stringify(body) });

it("tanpa atau salah secret -> 401; HOOK_SECRET kosong -> 401", async () => {
  const { POST } = await import("../src/app/api/hook/luar-kota/route");
  expect((await POST(req({ eventId: EID }))).status).toBe(401);
  expect((await POST(req({ eventId: EID }, "salah"))).status).toBe(401);
  delete process.env.HOOK_SECRET;
  expect((await POST(req({ eventId: EID }, ""))).status).toBe(401);
  expect((await POST(req({ eventId: EID }, "undefined"))).status).toBe(401);
  expect(minta).not.toHaveBeenCalled();
});
it("eventId tidak valid -> 400", async () => {
  const { POST } = await import("../src/app/api/hook/luar-kota/route");
  expect((await POST(req({ eventId: "bukan-id" }, "rahasia-hook-123"))).status).toBe(400);
});
it("permohonan luar kota pertama -> WA ke Sekjen, terkirim true", async () => {
  const { POST } = await import("../src/app/api/hook/luar-kota/route");
  const r = await POST(req({ eventId: EID }, "rahasia-hook-123"));
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ terkirim: true });
  const o = minta.mock.calls[0][0];
  expect(o).toMatchObject({ jenis: "luar-kota", penerima: ["sj@x.com"], tautan: `luar:${EID}` });
  expect(o.pesan).toContain("Pak Budi");
  expect(o.pesan).toContain("PD Santa Maria");
  expect(o.pesan).toContain("2026-12-05");
  expect(o.url).toBe("https://e.example/dashboard?tab=luar");
});
it("panggilan kedua untuk id sama (sudah ada catatan lonceng) -> terkirim false, tanpa WA", async () => {
  notifRows = [{ id: "recNOTIF0000000001", fields: {} }];
  const { notifLuarKota } = await import("../src/lib/luar-kota");
  expect(await notifLuarKota(EID)).toEqual({ terkirim: false });
  expect(minta).not.toHaveBeenCalled();
});
it("dua panggilan serentak -> WA hanya sekali", async () => {
  const { notifLuarKota } = await import("../src/lib/luar-kota");
  const [a, b] = await Promise.all([notifLuarKota(EID), notifLuarKota(EID)]);
  expect([a.terkirim, b.terkirim].sort()).toEqual([false, true]);
  expect(minta).toHaveBeenCalledTimes(1);
});
it("bukan luar kota, dibatalkan, atau sudah di-ACC -> tidak ada WA", async () => {
  const { notifLuarKota } = await import("../src/lib/luar-kota");
  ev.fields.fldqjU4a9td4dSeL5 = "BPK Bandung"; expect(await notifLuarKota(EID)).toEqual({ terkirim: false });
  ev.fields.fldqjU4a9td4dSeL5 = ""; expect(await notifLuarKota(EID)).toEqual({ terkirim: false });
  ev.fields.fldqjU4a9td4dSeL5 = "BPK Surabaya"; ev.fields.fldhLU1ca1XQz9jzr = true; expect(await notifLuarKota(EID)).toEqual({ terkirim: false });
  ev.fields.fldhLU1ca1XQz9jzr = false; ev.fields.fld90EYItgFfqDNn7 = ["recACC0000000001"]; expect(await notifLuarKota(EID)).toEqual({ terkirim: false });
  expect(minta).not.toHaveBeenCalled();
});
