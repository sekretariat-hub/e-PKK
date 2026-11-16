import { describe, it, expect, vi, beforeEach } from "vitest";
import { T } from "../src/lib/policy";

const TK = { judul: "fldYqmy7odEnwqbrh", event: "fldxM5KAH4txJsC4s", paroki: "fldfHUZK6u2zkI7Yu", token: "flddxcs0pEaEZlXL1", status: "fldidtKcy6zhf1owX", oleh: "fldfMsKP2X4j6WGXM" };
const EV = { nama: "fld0d9tIyi4nyTZsM" };
const PAR = { nama: "fldskPQJ7WQgCVODZ", kus: "fldTx78aUdQXrpSMY" };
const KID = "recKKKKKKKKKKKKKK", EID = "recEEEEEEEEEEEEEE", PID = "recPPPPPPPPPPPPPP";

let kegs: Record<string, Record<string, any>>, evName: string, posts: any[], approvals: any[], notifs: any[], pendaftar: number;

vi.mock("../src/lib/minta-approval", () => ({ mintaApproval: async (o: any) => { approvals.push(o); return { wa: 0, tanpaNomor: 0, gagal: 0 }; } }));
vi.mock("../src/lib/notif", () => ({ buatNotif: async (to: string[], pesan: string, tautan: string) => { notifs.push({ to, pesan, tautan }); } }));
vi.mock("../src/lib/penerima", () => ({ emailsTimSep: async () => ["tim@x.com"] }));
vi.mock("../src/lib/proxy", () => ({ clearProxyCache: () => {} }));
vi.mock("../src/lib/airtable", () => ({
  at: async (path: string, init: any = {}) => {
    const m = init.method || "GET", body = init.body ? JSON.parse(init.body) : null;
    if (path.includes(`/${T.events}`)) {
      if (m === "POST") { evName = body.records[0].fields[EV.nama]; return { records: [{ id: EID }] }; }
      if (m === "PATCH") { evName = body.records[0].fields[EV.nama]; return { records: [{ id: EID }] }; }
      return { id: EID, fields: { [EV.nama]: evName } };
    }
    if (path.includes(`/${T.sepKegiatan}`)) {
      if (m === "POST") { posts.push(body); kegs[KID] = { ...body.records[0].fields }; return { records: [{ id: KID }] }; }
      if (m === "PATCH") { Object.assign(kegs[body.records[0].id], body.records[0].fields); return { records: [{ id: body.records[0].id }] }; }
      const id = path.split("/").pop()!.split("?")[0];
      return { id, fields: kegs[id] };
    }
    if (path.includes(`/${T.paroki}`)) return { id: PID, fields: { [PAR.nama]: "Paroki Cicadas" } };
    if (path.includes(`/${T.pendaftarSep}`)) { pendaftar++; return { records: [] }; }
    throw new Error("tak terduga: " + path);
  },
  listPage: async () => ({ records: Object.entries(kegs).map(([id, f]) => ({ id, fields: f })) }),
  listUntil: async () => ({ records: [{ id: "recX", fields: { [PAR.nama]: "Paroki Cicadas", [PAR.kus]: "Bandung" } }] }),
}));

const acc = (sepPeran: string, extra: any = {}) => ({ email: "u@x.com", level: "Edit", tabs: ["KEP"], sepPeran, sepParoki: [PID], viewAs: false, ...extra }) as any;
const tim = acc("Tim SEP BPK"), pic = acc("PIC SEP Paroki"), lihat = acc("");

beforeEach(() => { kegs = {}; evName = ""; posts = []; approvals = []; notifs = []; pendaftar = 0; });

describe("SEP baru perlu persetujuan Tim SEP", () => {
  it("(a) PIC membuat KEP: status Menunggu Persetujuan, satu permintaan WA jenis sep ke Tim SEP dengan nama dan paroki", async () => {
    const { sepCall } = await import("../src/lib/sep");
    await sepCall("create", { nama: "KEP Angkatan 9", jenis: "KEP", parokiId: PID, tgl: "2027-02-14" }, pic);
    expect(posts[0].records[0].fields[TK.status]).toBe("Menunggu Persetujuan");
    expect(posts[0].typecast).toBe(true);
    expect(evName.startsWith("[Menunggu] ")).toBe(true);
    expect(approvals).toHaveLength(1);
    expect(approvals[0].jenis).toBe("sep");
    expect(approvals[0].penerima).toEqual(["tim@x.com"]);
    expect(approvals[0].pesan).toContain("KEP Angkatan 9");
    expect(approvals[0].pesan).toContain("Paroki Cicadas");
    expect(approvals[0].tautan).toBe(`sep:${KID}`);
  });

  it("(f) Tim SEP membuat SEP: langsung Berjalan, tanpa WA dan tanpa awalan Menunggu", async () => {
    const { sepCall } = await import("../src/lib/sep");
    await sepCall("create", { nama: "KEP Exe 1", jenis: "KEP Exe", tgl: "2027-02-14" }, tim);
    expect(posts[0].records[0].fields[TK.status]).toBe("Berjalan");
    expect(evName.startsWith("[Menunggu]")).toBe(false);
    expect(approvals).toHaveLength(0);
  });

  it("(b) link pendaftaran kegiatan yang belum disetujui ditolak 403 dan tidak membuat pendaftar", async () => {
    const { sepCall, kegByToken, submitPublic } = await import("../src/lib/sep");
    await sepCall("create", { nama: "KEP Angkatan 9", jenis: "KEP", parokiId: PID, tgl: "2027-02-14" }, pic);
    const token = kegs[KID][TK.token];
    await expect(kegByToken(token)).rejects.toMatchObject({ status: 403, message: "Kegiatan ini belum disetujui Tim SEP BPK." });
    const body = { nama: "Maria Anna", lahir: "1985-04-23", alamat: "Jl A", paroki: "Paroki Cicadas", jk: "Wanita", email: "a@b.co", wa: "081234567890", setuju: [true, true, true, true, true] };
    await expect(submitPublic(token, body, "9.9.9.1")).rejects.toMatchObject({ status: 403 });
    expect(pendaftar).toBe(0);
  });

  it("(c) setujui oleh Tim SEP: Berjalan, awalan dihapus, pemohon dikabari; PIC dan peran lihat 403; kedua kali 409", async () => {
    const { sepCall } = await import("../src/lib/sep");
    await sepCall("create", { nama: "KEP Angkatan 9", jenis: "KEP", parokiId: PID, tgl: "2027-02-14" }, pic);
    await expect(sepCall("setujui", { kegiatanId: KID }, pic)).rejects.toMatchObject({ status: 403 });
    await expect(sepCall("setujui", { kegiatanId: KID }, lihat)).rejects.toMatchObject({ status: 403 });
    expect(kegs[KID][TK.status]).toBe("Menunggu Persetujuan");
    expect(await sepCall("setujui", { kegiatanId: KID }, tim)).toEqual({ ok: true, status: "Berjalan" });
    expect(kegs[KID][TK.status]).toBe("Berjalan");
    expect(evName.startsWith("[Menunggu]")).toBe(false);
    expect(notifs.at(-1)!.to).toEqual(["u@x.com"]);
    await expect(sepCall("setujui", { kegiatanId: KID }, tim)).rejects.toMatchObject({ status: 409 });
    await expect(sepCall("tolak", { kegiatanId: KID }, tim)).rejects.toMatchObject({ status: 409 });
  });

  it("(c2) setelah disetujui, link pendaftaran aktif lagi", async () => {
    const { sepCall, kegByToken } = await import("../src/lib/sep");
    await sepCall("create", { nama: "KEP Angkatan 9", jenis: "KEP", parokiId: PID, tgl: "2027-02-14" }, pic);
    await sepCall("setujui", { kegiatanId: KID }, tim);
    expect((await kegByToken(kegs[KID][TK.token]))!.judul).toBe("KEP Angkatan 9");
  });

  it("(d) tolak: status Ditolak, pemohon dapat lonceng biasa tanpa WA, link tetap mati", async () => {
    const { sepCall, kegByToken } = await import("../src/lib/sep");
    await sepCall("create", { nama: "KEP Angkatan 9", jenis: "KEP", parokiId: PID, tgl: "2027-02-14" }, pic);
    approvals.length = 0;
    expect(await sepCall("tolak", { kegiatanId: KID }, tim)).toEqual({ ok: true, status: "Ditolak" });
    expect(kegs[KID][TK.status]).toBe("Ditolak");
    expect(notifs.at(-1)).toMatchObject({ to: ["u@x.com"], tautan: `sep:${KID}` });
    expect(approvals).toHaveLength(0);
    await expect(kegByToken(kegs[KID][TK.token])).rejects.toMatchObject({ status: 403 });
  });

  it("(e) pendaftaran peserta pada kegiatan Berjalan tidak memicu permintaan WA", async () => {
    const { sepCall, submitPublic } = await import("../src/lib/sep");
    await sepCall("create", { nama: "KEP Exe 1", jenis: "KEP Exe", tgl: "2027-02-14" }, tim);
    const body = { nama: "Maria Anna", lahir: "1985-04-23", alamat: "Jl A", paroki: "Paroki Cicadas", jk: "Wanita", email: "a@b.co", wa: "081234567890", setuju: [true, true, true, true, true] };
    await submitPublic(kegs[KID][TK.token], body, "9.9.9.2");
    expect(pendaftar).toBe(1);
    expect(approvals).toHaveLength(0);
  });
});
