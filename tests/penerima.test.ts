import { describe, it, expect, vi, beforeEach } from "vitest";
import { AF } from "../src/lib/access";
import { T } from "../src/lib/policy";

const UMAT_WA = "fldzY1Z2QvIIEkYXR";
let pengguna: any[];
let umat: Record<string, any>;

const user = (id: string, email: string, status: string, jab: string, extra: Record<string, any> = {}) => ({
  id, fields: { [AF.email]: email, [AF.status]: status, [AF.jabLk]: jab ? [jab] : [], ...extra },
});

beforeEach(() => {
  vi.resetModules();
  process.env.AIRTABLE_TOKEN = "x";
  pengguna = [
    user("recAAAAAAAAAAAAAA", "Sekre@x.com", "Disetujui", "Sekretaris", { [AF.umat]: ["recUUUUUUUUUUUUU1"] }),
    user("recBBBBBBBBBBBBBB", "sekre@x.com", "Disetujui", "Sekretaris"), // duplikat huruf besar-kecil
    user("recCCCCCCCCCCCCCC", "tunggu@x.com", "Menunggu", "Sekretaris"),
    user("recDDDDDDDDDDDDDD", "sekjen@x.com", "Disetujui", "Sekretaris Jenderal"),
    user("recEEEEEEEEEEEEEE", "ketua@x.com", "Disetujui", "Ketua Seksi Musik"),
    user("recHHHHHHHHHHHHHH", "gabung@x.com", "Disetujui", "Ketua Seksi Musik, Sekretariat"),
    user("recIIIIIIIIIIIIII", "forkom@x.com", "Disetujui", "Koordinator Forkom Doa"),
    user("recJJJJJJJJJJJJJJ", "koor@x.com", "Disetujui", "Koordinator BPKPKK Bandung"),
    user("recFFFFFFFFFFFFFF", "sep@x.com", "Disetujui", "", { [AF.sepPeran]: "Tim SEP BPK" }),
    user("recGGGGGGGGGGGGGG", "pic@x.com", "Disetujui", "", { [AF.sepPeran]: "PIC SEP Paroki" }),
  ];
  umat = { recUUUUUUUUUUUUU1: { id: "recUUUUUUUUUUUUU1", fields: { [UMAT_WA]: "0815-7005-842" } } };
  vi.stubGlobal("fetch", async (u: any) => {
    const url = new URL(String(u));
    if (url.pathname.includes(T.pengguna)) return new Response(JSON.stringify({ records: pengguna }), { status: 200 });
    const m = new RegExp(`/${T.umat}/(rec\\w+)`).exec(url.pathname);
    if (m && umat[m[1]]) return new Response(JSON.stringify(umat[m[1]]), { status: 200 });
    return new Response("{}", { status: 404 });
  });
});

describe("emailsByJabatan", () => {
  it("hanya akun Disetujui dengan jabatan cocok, huruf kecil, tanpa duplikat", async () => {
    const { emailsByJabatan, RE_APPROVER_USER } = await import("../src/lib/penerima");
    // Sekretaris Jenderal bukan penerima persetujuan user baru; jabatan ganda dicek per jabatan.
    expect(await emailsByJabatan(RE_APPROVER_USER)).toEqual(["sekre@x.com", "gabung@x.com"]);
  });

  it("RE_ALERT mencakup Sekretaris, Sekretaris Jenderal, dan Koordinator tetapi bukan ketua seksi", async () => {
    const { RE_ALERT } = await import("../src/lib/penerima");
    for (const j of ["Sekretaris", "Sekretaris Jenderal", "Sekretaris Jendral", "Koordinator", "Koordinator BPKPKK Bandung"]) expect(RE_ALERT.test(j), j).toBe(true);
    for (const j of ["Ketua Seksi Musik", "Koordinator Forkom Doa", "Wakil Koordinator Inti I", "Sie Sekretaris"]) expect(RE_ALERT.test(j), j).toBe(false);
  });

  it("emailsByJabatan(RE_ALERT) memilih Sekretaris, Sekjen, dan Koordinator BPK saja", async () => {
    const { emailsByJabatan, RE_ALERT } = await import("../src/lib/penerima");
    expect(await emailsByJabatan(RE_ALERT)).toEqual(["sekre@x.com", "sekjen@x.com", "koor@x.com"]);
  });
});

describe("emailsTimSep", () => {
  it("hanya akun Disetujui berperan Tim SEP BPK", async () => {
    const { emailsTimSep } = await import("../src/lib/penerima");
    expect(await emailsTimSep()).toEqual(["sep@x.com"]);
  });
});

describe("nomorWaOf", () => {
  it("mengambil nomor WA dari umat yang ditautkan ke akun", async () => {
    const { nomorWaOf } = await import("../src/lib/penerima");
    expect(await nomorWaOf("SEKRE@x.com")).toBe("0815-7005-842");
  });

  it("mengembalikan string kosong bila akun tidak punya link umat atau tidak dikenal", async () => {
    const { nomorWaOf } = await import("../src/lib/penerima");
    expect(await nomorWaOf("sekjen@x.com")).toBe("");
    expect(await nomorWaOf("tidak-ada@x.com")).toBe("");
  });
});
