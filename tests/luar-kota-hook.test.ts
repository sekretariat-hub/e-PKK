import { describe, it, expect, vi, beforeEach } from "vitest";

const SM = { tgl: "fldFJ1CisvUveU2cM", nama: "fldQEDVuqLDDDSSex", nama2: "fldmgPwKTRjNtnAyL", pd: "flddzhNZ23pbUSuEk", asal: "fldqjU4a9td4dSeL5", acc: "fld4hZqPpwywk8yfM", bpk: "fldUrgjrHXaaYqTbk", hapus: "fldhLU1ca1XQz9jzr" };
const ID = "recAAAAAAAAAAAAAA";
let permohonan: Record<string, any>, approvals: any[], sudahAda: boolean, formulas: string[];

vi.mock("../src/lib/minta-approval", () => ({ mintaApproval: async (o: any) => { approvals.push(o); sudahAda = true; return { wa: 1, tanpaNomor: 0, gagal: 0 }; } }));
vi.mock("../src/lib/proker-roles", () => ({ emailsWhere: async () => ["sekjen@x.com"] }));
vi.mock("../src/lib/airtable", () => ({
  getRecord: async () => ({ id: ID, fields: permohonan }),
  listPage: async (_b: string, _t: string, o: any) => { formulas.push(o.formula); return { records: sudahAda ? [{ id: "recN", fields: {} }] : [] }; },
}));

const req = (secret: string | null, body: any) => new Request("http://x/api/hook/luar-kota", { method: "POST", headers: secret === null ? {} : { "x-webhook-secret": secret }, body: JSON.stringify(body) });
const luar = () => ({ [SM.tgl]: "2027-03-07", [SM.nama]: "Rm. Yohanes", [SM.pd]: ["PD Santo Paulus"], [SM.asal]: "BPK Jakarta" });

beforeEach(() => { permohonan = luar(); approvals = []; sudahAda = false; formulas = []; process.env.HOOK_SECRET = "rahasia-uji"; });

describe("POST /api/hook/luar-kota", () => {
  it("tanpa secret, secret salah, atau HOOK_SECRET kosong → 401 dan tidak ada WA", async () => {
    const { POST } = await import("../src/app/api/hook/luar-kota/route");
    expect((await POST(req(null, { eventId: ID }))).status).toBe(401);
    expect((await POST(req("salah", { eventId: ID }))).status).toBe(401);
    process.env.HOOK_SECRET = "";
    expect((await POST(req("", { eventId: ID }))).status).toBe(401);
    expect(approvals).toHaveLength(0);
  });
  it("eventId tidak valid → 400", async () => {
    const { POST } = await import("../src/app/api/hook/luar-kota/route");
    expect((await POST(req("rahasia-uji", { eventId: "x" }))).status).toBe(400);
    expect((await POST(req("rahasia-uji", {}))).status).toBe(400);
  });
  it("permohonan luar kota pertama → satu permintaan ke Sekjen dengan nama, PD, tanggal; terkirim true", async () => {
    const { POST } = await import("../src/app/api/hook/luar-kota/route");
    const r = await POST(req("rahasia-uji", { eventId: ID }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ terkirim: true });
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({ jenis: "luar-kota", penerima: ["sekjen@x.com"], tautan: `luar:${ID}` });
    expect(approvals[0].pesan).toContain("Rm. Yohanes");
    expect(approvals[0].pesan).toContain("PD Santo Paulus");
    expect(approvals[0].pesan).toContain("2027-03-07");
    expect(approvals[0].url).toContain("/dashboard#luar");
  });
  it("panggilan kedua dengan id sama → terkirim false tanpa WA; pencarian memakai tautan luar:<id>", async () => {
    const { POST } = await import("../src/app/api/hook/luar-kota/route");
    await POST(req("rahasia-uji", { eventId: ID }));
    const r2 = await POST(req("rahasia-uji", { eventId: ID }));
    expect(await r2.json()).toEqual({ terkirim: false });
    expect(approvals).toHaveLength(1);
    expect(formulas.at(-1)).toContain(`luar:${ID}`);
  });
  it("bukan luar kota (BPK Bandung) atau sudah dibatalkan → tidak ada WA", async () => {
    const { POST } = await import("../src/app/api/hook/luar-kota/route");
    permohonan = { ...luar(), [SM.asal]: "BPK Bandung" };
    expect(await (await POST(req("rahasia-uji", { eventId: ID }))).json()).toEqual({ terkirim: false });
    permohonan = { ...luar(), [SM.hapus]: true };
    expect(await (await POST(req("rahasia-uji", { eventId: ID }))).json()).toEqual({ terkirim: false });
    expect(approvals).toHaveLength(0);
  });
  it("asal kosong mengikuti aturan dashboard: luar kota hanya bila sudah ada ACC; lookup berupa array diterima", async () => {
    const { POST } = await import("../src/app/api/hook/luar-kota/route");
    permohonan = { [SM.tgl]: "2027-03-07", [SM.nama]: "Rm. A", [SM.asal]: [], [SM.bpk]: ["BPK Bandung"] };
    expect(await (await POST(req("rahasia-uji", { eventId: ID }))).json()).toEqual({ terkirim: false });
    permohonan = { [SM.tgl]: "2027-03-07", [SM.nama]: "Rm. B", [SM.asal]: [], [SM.bpk]: ["BPK Jakarta"], [SM.pd]: ["PD X"] };
    expect(await (await POST(req("rahasia-uji", { eventId: ID }))).json()).toEqual({ terkirim: true });
  });
});
