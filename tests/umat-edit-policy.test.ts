import { describe, it, expect } from "vitest";
import { checkWrite, HttpError, TABLES, T } from "@/lib/policy";

const base = { email: "a@b.c", nama: "A", status: "Disetujui", tabs: ["Umat"], level: "View" } as any;
const umat = (TABLES as any)[T.umat];
const ALL = ["fld0P7TE88KvYXORT", "fldIpQTSkFB9sU0lo", "fld469PYR80nAUNIF", "fldzY1Z2QvIIEkYXR", "fldsVrUbWf6iT5Jja", "fldAaQ3zmiLBhp4z9", "fldXGHvqnezzKZSCp", "fldxpeouH1hcxMzNc", "fldcQFzBtr9EELTtV", "fldrHJ6q3HZvApccl", "fldE62NyXuSJLvM8h", "fldQQpyVKX2eZGokY", "fldwywmGiZMscPgKq", "fld8wFTduClZ9Y5Al", "fldxZvnqVvAH4aWyd"];

describe("edit umat Superadmin", () => {
  it("Superadmin + tab Umat boleh mengubah semua 15 field", () => {
    const fields = Object.fromEntries(ALL.map((f) => [f, "x"]));
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
