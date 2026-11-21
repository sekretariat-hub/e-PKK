import { describe, it, expect, vi, beforeEach } from "vitest";

const getSchema = vi.fn();
const listUntil = vi.fn();
vi.mock("@/lib/airtable", () => ({ getSchema: (...a: any[]) => getSchema(...a), listUntil: (...a: any[]) => listUntil(...a) }));
const authFn = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authFn() }));
const effective = vi.fn();
vi.mock("@/lib/viewas", () => ({ AS_COOKIE: "as", effectiveAccess: (...a: any[]) => effective(...a) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { validateUmatFields, getUmatFormMeta, clearUmatFormCache } from "@/lib/umat-form";
import { GET } from "@/app/api/umat-form/route";

const ok = { fldIpQTSkFB9sU0lo: "Yosef", fldzY1Z2QvIIEkYXR: "0812", fldxpeouH1hcxMzNc: "Pria", fldAaQ3zmiLBhp4z9: "", fldXGHvqnezzKZSCp: "1971-07-10" };

describe("validateUmatFields", () => {
  it("menolak Nama kosong", () => expect(validateUmatFields({ ...ok, fldIpQTSkFB9sU0lo: " " })).toMatch(/Nama/));
  it("menolak No WA kosong", () => expect(validateUmatFields({ ...ok, fldzY1Z2QvIIEkYXR: "" })).toMatch(/WhatsApp/));
  it("menolak Jenis Kelamin kosong", () => expect(validateUmatFields({ ...ok, fldxpeouH1hcxMzNc: null })).toMatch(/Jenis Kelamin/));
  it("menolak email tidak valid", () => expect(validateUmatFields({ ...ok, fldAaQ3zmiLBhp4z9: "abc" })).toMatch(/Email/));
  it("menolak tanggal bukan YYYY-MM-DD", () => expect(validateUmatFields({ ...ok, fldXGHvqnezzKZSCp: "10/07/1971" })).toMatch(/Tanggal/));
  it("menerima data lengkap dengan email kosong", () => expect(validateUmatFields(ok)).toBeNull());
});

describe("getUmatFormMeta", () => {
  beforeEach(() => {
    clearUmatFormCache();
    const ch = (...n: string[]) => ({ type: "singleSelect", options: { choices: n.map((name) => ({ name })) } });
    getSchema.mockResolvedValue({
      tblwRNtXSVzgzVXuk: { id: "tblwRNtXSVzgzVXuk", primaryFieldId: "x", fields: { fldxpeouH1hcxMzNc: ch("Pria", "Wanita"), fldQQpyVKX2eZGokY: ch("Pengurus BPK"), fldwywmGiZMscPgKq: ch("Imam"), fld8wFTduClZ9Y5Al: ch("KEP Paroki") } },
      tblNjwoOJEGZeQxkJ: { id: "tblNjwoOJEGZeQxkJ", primaryFieldId: "fldPD", fields: {} },
      tbl8sfqU6G47orPpn: { id: "tbl8sfqU6G47orPpn", primaryFieldId: "fldPar", fields: {} },
    });
    listUntil.mockImplementation(async (_b: string, t: string) => ({ records: t === "tblNjwoOJEGZeQxkJ" ? [{ id: "r2", fields: { fldPD: "PD Zeta" } }, { id: "r1", fields: { fldPD: "PD Alfa" } }] : [{ id: "p1", fields: { fldPar: "Paroki A" } }] }));
  });
  it("PD urut abjad dan opsi select dari skema", async () => {
    const m = await getUmatFormMeta();
    expect(m.pd.map((p) => p.nama)).toEqual(["PD Alfa", "PD Zeta"]);
    expect(m.jk).toEqual(["Pria", "Wanita"]);
    expect(m.kualifikasi).toEqual(["Imam"]);
    expect(m.paroki).toEqual([{ id: "p1", nama: "Paroki A" }]);
  });
});

describe("GET /api/umat-form", () => {
  beforeEach(() => { clearUmatFormCache(); authFn.mockResolvedValue({ user: { email: "a@b.c" } }); });
  it("401 tanpa login", async () => { authFn.mockResolvedValue(null); expect((await GET()).status).toBe(401); });
  it("403 untuk level Edit", async () => { effective.mockResolvedValue({ acc: { status: "Disetujui", level: "Edit", tabs: ["Umat"] } }); expect((await GET()).status).toBe(403); });
  it("403 untuk Superadmin dalam mode Lihat sebagai", async () => { effective.mockResolvedValue({ acc: { status: "Disetujui", level: "Superadmin", tabs: ["Umat"], viewAs: "x@y.z" } }); expect((await GET()).status).toBe(403); });
  it("200 untuk Superadmin", async () => {
    getSchema.mockResolvedValue({ tblwRNtXSVzgzVXuk: { fields: {} }, tblNjwoOJEGZeQxkJ: { primaryFieldId: "f", fields: {} }, tbl8sfqU6G47orPpn: { primaryFieldId: "f", fields: {} } });
    listUntil.mockResolvedValue({ records: [] });
    effective.mockResolvedValue({ acc: { status: "Disetujui", level: "Superadmin", tabs: ["Umat"] } });
    expect((await GET()).status).toBe(200);
  });
});
