import { describe, it, expect, vi, beforeEach } from "vitest";

const calls: any[] = [];
let tutup = "2099-01-01T14:00:00.000Z";
let terdaftar: any[] = [];
const umatSemua = [
  { id: "recUMAT0000000002", fields: { fldIpQTSkFB9sU0lo: "Budi Santoso", fldOovF470MdN2fMg: ["PD Satu"] } },
  { id: "recUMAT0000000001", fields: { fldIpQTSkFB9sU0lo: "Ani Wijaya", fld469PYR80nAUNIF: "Ani", fldOovF470MdN2fMg: ["PD Dua"] } },
];
vi.mock("@/lib/airtable", () => ({
  at: vi.fn(async (path: string, init: any) => { calls.push({ path, body: init?.body ? JSON.parse(init.body) : null }); return { records: [{ id: "recBARU0000000001" }] }; }),
  getRecord: vi.fn(async (_b: string, t: string, id: string) => t === "tblwRNtXSVzgzVXuk"
    ? { id, fields: { fldIpQTSkFB9sU0lo: "Budi Santoso", fldrHJ6q3HZvApccl: ["recPD000000000001"] } }
    : { id, fields: { fld0d9tIyi4nyTZsM: "261214-Training Alpha Bandung", fldoIkx9wLMaKOa38: "2099-12-14", fldI1RKkKVaua8DH0: tutup, fldROaJ8rPAZQPTED: "Ivone Chow", fld4qestIo5EjWAvk: "+62 811-217-036" } }),
  getSchema: vi.fn(async () => ({ tbltiJ1qDJEwfWPLg: { fields: { fldXodEfnTDwm4XoI: { options: { choices: [{ name: "Koordinator PD" }, { name: "Lainnya" }] } } } } })),
  listPage: vi.fn(async () => ({ records: [] })),
  listUntil: vi.fn(async (_b: string, table: string) => table === "tbltiJ1qDJEwfWPLg" ? { records: terdaftar }
    : table === "tblNjwoOJEGZeQxkJ" ? { records: [{ id: "recPD000000000001", fields: { fldcHytxm3KCMCdOO: "PD Satu" } }] }
    : { records: umatSemua }),
}));
import { bacaTokenDaftar, buatTokenDaftar, kirimDaftar, normNama, statusBuka, umatUntukEvent } from "@/lib/daftar-event";

const EV = "recEVENT00000000A";
const tok = () => buatTokenDaftar(EV);
beforeEach(() => { process.env.AUTH_SECRET = "rahasia"; calls.length = 0; terdaftar = []; tutup = "2099-01-01T14:00:00.000Z"; });

describe("token", () => {
  it("bolak-balik, dan token palsu/absensi ditolak", () => {
    expect(bacaTokenDaftar(tok())).toBe(EV);
    expect(bacaTokenDaftar(EV + ".palsu")).toBeNull();
    expect(bacaTokenDaftar("")).toBeNull();
  });
});

describe("statusBuka", () => {
  it("tutup sesuai TanggalCloseRegistrasi", () => {
    expect(statusBuka({ tgl: "2026-12-14", buka: "", tutup: "2026-12-11T14:00:00.000Z" }, Date.parse("2026-12-11T13:59:00Z")).buka).toBe(true);
    const x = statusBuka({ tgl: "2026-12-14", buka: "", tutup: "2026-12-11T14:00:00.000Z" }, Date.parse("2026-12-11T14:01:00Z"));
    expect(x.buka).toBe(false); expect(x.alasan).toMatch(/ditutup/);
  });
  it("belum dibuka; tanpa tutup berlaku sampai akhir hari acara WIB", () => {
    expect(statusBuka({ tgl: "2026-12-14", buka: "2026-12-01T00:00:00Z", tutup: "" }, Date.parse("2026-11-30T00:00:00Z")).buka).toBe(false);
    expect(statusBuka({ tgl: "2026-12-14", buka: "", tutup: "" }, Date.parse("2026-12-14T16:00:00Z")).buka).toBe(true);
    expect(statusBuka({ tgl: "2026-12-14", buka: "", tutup: "" }, Date.parse("2026-12-14T17:30:00Z")).buka).toBe(false);
  });
});

describe("umatUntukEvent", () => {
  it("urut abjad, menandai yang sudah terdaftar, tanpa WA/email", async () => {
    terdaftar = [{ id: "recPEND00000000B1", fields: { flduf15moMpZSklGL: [EV], fldqvA9dTUmWLfRr2: ["recUMAT0000000002"], fldNGGEcwHqIsQPct: { name: "Daftar" } } }];
    const r = await umatUntukEvent(tok());
    expect(r.umat.map((u) => u.nama)).toEqual(["Ani Wijaya", "Budi Santoso"]);
    expect(r.umat.find((u) => u.nama === "Budi Santoso")!.ada).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/wa|email/i);
  });
  it("yang berstatus Batal tidak dianggap terdaftar", async () => {
    terdaftar = [{ id: "recPEND00000000B1", fields: { flduf15moMpZSklGL: [EV], fldqvA9dTUmWLfRr2: ["recUMAT0000000002"], fldNGGEcwHqIsQPct: { name: "Batal" } } }];
    expect((await umatUntukEvent(tok())).umat.every((u) => !u.ada)).toBe(true);
  });
  it("event yang sudah ditutup menolak", async () => {
    tutup = "2020-01-01T00:00:00.000Z";
    await expect(umatUntukEvent(tok())).rejects.toThrow(/tidak dibuka/);
  });
});

describe("kirimDaftar", () => {
  it("memilih nama yang ada: membuat Pendaftaran Events dengan PD, aktif, jabatan", async () => {
    const r = await kirimDaftar(tok(), { umat: "recUMAT0000000002", aktif: true, jabatan: ["Koordinator PD"], seksiLain: "Humas" });
    expect(r.ok).toBe(true);
    const c = calls.find((x) => x.path.includes("tbltiJ1qDJEwfWPLg"))!;
    expect(c.body.records[0].fields).toMatchObject({ flduf15moMpZSklGL: [EV], fldqvA9dTUmWLfRr2: ["recUMAT0000000002"], fldNGGEcwHqIsQPct: "Daftar", fldiRoeZ0i2j5r9AV: true, fldMBf67dQxv51kY1: ["recPD000000000001"], fldXodEfnTDwm4XoI: ["Koordinator PD"], fld6LN4ZK9d6K2dfa: "Humas" });
  });
  it("sudah terdaftar: ditolak 409", async () => {
    terdaftar = [{ id: "recPEND00000000B1", fields: { flduf15moMpZSklGL: [EV], fldqvA9dTUmWLfRr2: ["recUMAT0000000002"], fldNGGEcwHqIsQPct: { name: "Confirmed" } } }];
    await expect(kirimDaftar(tok(), { umat: "recUMAT0000000002" })).rejects.toMatchObject({ status: 409 });
  });
  it("Create new dengan nama yang sudah ada (beda huruf besar/spasi) diblokir, tidak ada yang ditulis", async () => {
    await expect(kirimDaftar(tok(), { baru: { nama: "  budi   SANTOSO ", wa: "08123456789", pd: "recPD000000000001" } })).rejects.toMatchObject({ status: 409 });
    expect(calls.length).toBe(0);
  });
  it("Create new nama baru: membuat umat lalu pendaftaran", async () => {
    const r = await kirimDaftar(tok(), { baru: { nama: "Citra Lestari", wa: "08123456789", pd: "recPD000000000001" } });
    expect(r.baru).toBe(true);
    expect(calls[0].path).toContain("tblwRNtXSVzgzVXuk");
    expect(calls[0].body.records[0].fields).toMatchObject({ fldIpQTSkFB9sU0lo: "Citra Lestari", fldrHJ6q3HZvApccl: ["recPD000000000001"] });
    expect(calls[1].path).toContain("tbltiJ1qDJEwfWPLg");
  });
  it("jabatan tidak valid, WA kosong, atau PD tidak dikenal ditolak; honeypot diam-diam", async () => {
    await expect(kirimDaftar(tok(), { umat: "recUMAT0000000002", jabatan: ["Raja"] })).rejects.toMatchObject({ status: 400 });
    await expect(kirimDaftar(tok(), { baru: { nama: "Dewi Anggraini", wa: "", pd: "recPD000000000001" } })).rejects.toMatchObject({ status: 400 });
    await expect(kirimDaftar(tok(), { baru: { nama: "Dewi Anggraini", wa: "0812345678", pd: "recPD00000000XXXX" } })).rejects.toMatchObject({ status: 400 });
    expect(await kirimDaftar(tok(), { website: "bot" })).toEqual({ ok: true });
    expect(calls.length).toBe(0);
  });
  it("normNama", () => { expect(normNama("  Ánna  MARIA ")).toBe("anna maria"); });
});

describe("tutup sesuai tanggal close registration", () => {
  it("form terbuka sebelum dan menolak kirim sesudah TanggalCloseRegistrasi", async () => {
    tutup = new Date(Date.now() + 60_000).toISOString();
    await expect(kirimDaftar(tok(), { umat: "recUMAT0000000002" })).resolves.toMatchObject({ ok: true });
    tutup = new Date(Date.now() - 60_000).toISOString();
    await expect(kirimDaftar(tok(), { umat: "recUMAT0000000002" })).rejects.toMatchObject({ status: 403 });
    const { infoDaftar } = await import("@/lib/daftar-event");
    expect((await infoDaftar(tok())).buka).toBe(false);
  });
});
