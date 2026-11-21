import { describe, it, expect } from "vitest";
import { checkWrite, HttpError, TABLES, T } from "@/lib/policy";

const base = { email: "a@b.c", nama: "A", status: "Disetujui", tabs: ["Umat"], level: "View" } as any;
const umat = (TABLES as any)[T.umat];
const ALL = ["fld0P7TE88KvYXORT", "fldIpQTSkFB9sU0lo", "fld469PYR80nAUNIF", "fldzY1Z2QvIIEkYXR", "fldsVrUbWf6iT5Jja", "fldAaQ3zmiLBhp4z9", "fldXGHvqnezzKZSCp", "fldxpeouH1hcxMzNc", "fldcQFzBtr9EELTtV", "fldrHJ6q3HZvApccl", "fldE62NyXuSJLvM8h", "fldQQpyVKX2eZGokY", "fldwywmGiZMscPgKq", "fld8wFTduClZ9Y5Al", "fldxZvnqVvAH4aWyd"];

describe("edit umat Superadmin", () => {
  it("Superadmin + tab Umat boleh mengubah semua 15 field", () => {
    const fields = Object.fromEntries(ALL.map((f) => [f, "x"])); fields.fldAaQ3zmiLBhp4z9 = "a@b.co"; fields.fldXGHvqnezzKZSCp = "1971-07-10";
    expect(() => checkWrite(umat, "update", [{ id: "rec1", fields }], { ...base, level: "Superadmin" })).not.toThrow();
  });
  it("Superadmin menolak field di luar daftar (Foto, formula)", () => {
    for (const f of ["fldWLeXoMSiVp5RbG", "fld1Hoz1aNGsuzggS"])
      expect(() => checkWrite(umat, "update", [{ id: "rec1", fields: { [f]: "x" } }], { ...base, level: "Superadmin" })).toThrow(HttpError);
  });
  it("Edit, Admin, View dengan tab Umat menolak field tambahan", () => {
    for (const level of ["Edit", "Admin", "View"])
      expect(() => checkWrite(umat, "update", [{ id: "rec1", fields: { fld0P7TE88KvYXORT: "Yosef" } }], { ...base, level })).toThrow(HttpError);
  });
  it("Superadmin tanpa tab Umat ditolak", () => {
    expect(() => checkWrite(umat, "update", [{ id: "rec1", fields: { fld0P7TE88KvYXORT: "Yosef" } }], { ...base, level: "Superadmin", tabs: ["Dashboard"] })).toThrow(HttpError);
  });
});

describe("nilai field umat (server)", () => {
  const sa = { ...base, level: "Superadmin" };
  const w = (fields: any) => () => checkWrite(umat, "update", [{ id: "rec1", fields }], sa);
  it("Nama atau No WA tidak boleh dikosongkan", () => {
    expect(w({ fldIpQTSkFB9sU0lo: "  " })).toThrow(HttpError);
    expect(w({ fldzY1Z2QvIIEkYXR: null })).toThrow(HttpError);
    expect(w({ fldxpeouH1hcxMzNc: null })).toThrow(HttpError);
  });
  it("Email tidak valid dan tanggal salah format ditolak", () => {
    expect(w({ fldAaQ3zmiLBhp4z9: "abc" })).toThrow(HttpError);
    expect(w({ fldXGHvqnezzKZSCp: "10/07/1971" })).toThrow(HttpError);
  });
  it("mengosongkan Email, Tanggal, Kualifikasi, Paroki, PD diizinkan", () => {
    expect(w({ fldAaQ3zmiLBhp4z9: null, fldXGHvqnezzKZSCp: null, fldwywmGiZMscPgKq: null, fldE62NyXuSJLvM8h: [], fldrHJ6q3HZvApccl: [] })).not.toThrow();
  });
});
