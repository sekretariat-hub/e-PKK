import { describe, it, expect, vi, beforeEach } from "vitest";

const TK = { judul: "fldYqmy7odEnwqbrh", event: "fldxM5KAH4txJsC4s", paroki: "fldfHUZK6u2zkI7Yu", token: "flddxcs0pEaEZlXL1", status: "fldidtKcy6zhf1owX", oleh: "fldfMsKP2X4j6WGXM" };
const TB = { keg: "tblGuf3UnMnGBqpbR", ev: "tblbAIILkeRIwn3kl", par: "tbl8sfqU6G47orPpn", pend: "tbllhFlsiFLaZzHkG" };
const PID = "recPAROKI00000001", KID = "recKEGIATAN000001", EID = "recEVENT000000001";

const minta = vi.hoisted(() => vi.fn(async (_o: any) => ({ wa: 1, tanpaNomor: 0, gagal: 0 })));
const notif = vi.hoisted(() => vi.fn(async (_p: string[], _m: string, _t: string) => {}));
vi.mock("../src/lib/minta-approval", () => ({ mintaApproval: minta }));
vi.mock("../src/lib/notif", () => ({ buatNotif: notif }));
vi.mock("../src/lib/penerima", () => ({ emailsTimSep: async () => ["tim@x.com"] }));
vi.mock("../src/lib/mail", () => ({ appUrl: () => "https://e.example" }));

let kegStatus: string, calls: { method: string; url: string; body?: any }[], evNama: string;
beforeEach(() => {
  vi.resetModules(); minta.mockClear(); notif.mockClear(); process.env.AIRTABLE_TOKEN = "x";
  kegStatus = "Menunggu Persetujuan"; calls = []; evNama = "[Menunggu] 261201-KEP Cicadas";
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubGlobal("fetch", async (u: any, init: any = {}) => {
    const url = new URL(String(u)), parts = url.pathname.split("/"), table = parts[3], rec = parts[4], method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, url: String(u), body });
    const ok = (j: any) => new Response(JSON.stringify(j), { status: 200 });
    if (table === TB.ev) return method === "POST" ? ok({ records: [{ id: EID }] }) : ok({ id: EID, fields: { fld0d9tIyi4nyTZsM: evNama, fldoIkx9wLMaKOa38: "2026-12-01" } });
    if (table === TB.par) return rec ? ok({ id: PID, fields: { fldskPQJ7WQgCVODZ: "Paroki Cicadas" } }) : ok({ records: [{ id: PID, fields: { fldskPQJ7WQgCVODZ: "Paroki Cicadas", fldTx78aUdQXrpSMY: "Keuskupan Bandung" } }] });
    if (table === TB.keg) {
      if (method === "POST") return ok({ records: [{ id: KID }] });
      if (method === "PATCH") return ok({ records: [] });
      const f = { [TK.judul]: "KEP Cicadas", [TK.event]: [EID], [TK.paroki]: [PID], [TK.token]: "TOKENABC123", [TK.status]: kegStatus, [TK.oleh]: "pic@x.com" };
      return rec ? ok({ id: KID, fields: f }) : ok({ records: [{ id: KID, fields: f }] });
    }
    return ok({ records: [] });
  });
});

const tim: any = { email: "tim@x.com", nama: "Tim", status: "Disetujui", level: "View", tabs: ["KEP"], sepPeran: "Tim SEP BPK", sepParoki: [] };
const pic: any = { email: "pic@x.com", nama: "Pic", status: "Disetujui", level: "Edit", tabs: ["KEP"], sepPeran: "PIC SEP Paroki", sepParoki: [PID] };
const view: any = { email: "v@x.com", nama: "V", status: "Disetujui", level: "View", tabs: ["KEP"], sepPeran: "", sepParoki: [] };
const baru = { nama: "KEP Cicadas", jenis: "KEP", parokiId: PID, tgl: "2026-12-01", lokasi: "Aula" };
const kegPost = () => calls.find((c) => c.method === "POST" && c.url.includes(TB.keg))!;

describe("SEP baru perlu persetujuan Tim SEP", () => {
  it("create oleh PIC: status Menunggu Persetujuan, event berawalan [Menunggu], WA ke Tim SEP", async () => {
    const { sepCall } = await import("../src/lib/sep");
    await sepCall("create", baru, pic);
    expect(kegPost().body.records[0].fields[TK.status]).toBe("Menunggu Persetujuan");
    expect(kegPost().body.typecast).toBe(true);
    const ev = calls.find((c) => c.method === "POST" && c.url.includes(TB.ev))!;
    expect(ev.body.records[0].fields.fld0d9tIyi4nyTZsM).toMatch(/^\[Menunggu\] \d{6}-KEP Cicadas$/);
    expect(minta).toHaveBeenCalledTimes(1);
    const o = minta.mock.calls[0][0];
    expect(o).toMatchObject({ jenis: "sep", penerima: ["tim@x.com"] });
    expect(o.pesan).toContain("KEP Cicadas");
    expect(o.pesan).toContain("Paroki Cicadas");
  });
  it("create oleh Tim SEP langsung Berjalan dan tidak memicu WA", async () => {
    const { sepCall } = await import("../src/lib/sep");
    await sepCall("create", baru, tim);
    expect(kegPost().body.records[0].fields[TK.status]).toBe("Berjalan");
    const ev = calls.find((c) => c.method === "POST" && c.url.includes(TB.ev))!;
    expect(ev.body.records[0].fields.fld0d9tIyi4nyTZsM).toMatch(/^\d{6}-KEP Cicadas$/);
    expect(minta).not.toHaveBeenCalled();
  });
  it("create tetap sukses walau WA gagal", async () => {
    minta.mockRejectedValueOnce(new Error("boom")); vi.spyOn(console, "error").mockImplementation(() => {});
    const { sepCall } = await import("../src/lib/sep");
    await expect(sepCall("create", baru, pic)).resolves.toMatchObject({ id: KID });
  });
  it("kegByToken menandai belum disetujui; submitPublic ditolak 403 tanpa membuat pendaftar", async () => {
    const { kegByToken, submitPublic } = await import("../src/lib/sep");
    expect(await kegByToken("TOKENABC123")).toMatchObject({ belum: true, selesai: false });
    await expect(submitPublic("TOKENABC123", { nama: "x" }, "1.1.1.1")).rejects.toMatchObject({ status: 403, message: "Kegiatan ini belum disetujui Tim SEP BPK." });
    expect(calls.some((c) => c.method === "POST" && c.url.includes(TB.pend))).toBe(false);
  });
  it("setujui oleh Tim: Berjalan, awalan [Menunggu] dibuang dari event; pemohon dapat lonceng biasa", async () => {
    const { sepCall } = await import("../src/lib/sep");
    expect(await sepCall("setujui", { kegiatanId: KID }, tim)).toMatchObject({ ok: true, status: "Berjalan" });
    const patch = calls.find((c) => c.method === "PATCH" && c.url.includes(TB.keg))!;
    expect(patch.body.records[0].fields[TK.status]).toBe("Berjalan");
    const evp = calls.find((c) => c.method === "PATCH" && c.url.includes(TB.ev))!;
    expect(evp.body.records[0].fields.fld0d9tIyi4nyTZsM).toBe("261201-KEP Cicadas");
    expect(notif).toHaveBeenCalledWith(["pic@x.com"], expect.stringContaining("disetujui"), "");
    expect(minta).not.toHaveBeenCalled();
  });
  it("tolak oleh Tim: status Ditolak, event diberi awalan [Ditolak], pemohon dikabari", async () => {
    const { sepCall } = await import("../src/lib/sep");
    expect(await sepCall("tolak", { kegiatanId: KID }, tim)).toMatchObject({ ok: true, status: "Ditolak" });
    const patch = calls.find((c) => c.method === "PATCH" && c.url.includes(TB.keg))!;
    expect(patch.body.records[0].fields[TK.status]).toBe("Ditolak");
    expect(patch.body.typecast).toBe(true);
    const evp = calls.find((c) => c.method === "PATCH" && c.url.includes(TB.ev))!;
    expect(evp.body.records[0].fields.fld0d9tIyi4nyTZsM).toBe("[Ditolak] 261201-KEP Cicadas");
    expect(notif).toHaveBeenCalledWith(["pic@x.com"], expect.stringContaining("ditolak"), "");
  });
  it("setujui/tolak oleh PIC atau view -> 403; keputusan kedua -> 409", async () => {
    const { sepCall } = await import("../src/lib/sep");
    await expect(sepCall("setujui", { kegiatanId: KID }, pic)).rejects.toMatchObject({ status: 403 });
    await expect(sepCall("tolak", { kegiatanId: KID }, view)).rejects.toMatchObject({ status: 403 });
    kegStatus = "Berjalan";
    await expect(sepCall("setujui", { kegiatanId: KID }, tim)).rejects.toMatchObject({ status: 409 });
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });
  it("pendaftar peserta pada kegiatan Berjalan tidak memicu WA persetujuan", async () => {
    kegStatus = "Berjalan";
    const { submitPublic } = await import("../src/lib/sep");
    const body = { nama: "Maria Anna", lahir: "1985-04-23", alamat: "Jl A", paroki: "Paroki Cicadas", jk: "Wanita", email: "a@b.co", wa: "081234567890", setuju: [true, true, true, true, true] };
    await expect(submitPublic("TOKENABC123", body, "2.2.2.2")).resolves.toEqual({ ok: true });
    expect(calls.some((c) => c.method === "POST" && c.url.includes(TB.pend))).toBe(true);
    expect(minta).not.toHaveBeenCalled();
  });
});
