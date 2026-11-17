import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("urutan Forkom 2", () => {
  it("jabatan ber-urut di Forkom 2 diurutkan setelah anggota lain, menurut urut", () => {
    const html = readFileSync("docs/prototipe-artifact.html", "utf8");
    expect(html).toContain('URUT_SEKSI.indexOf(best.seksi) > -1 && best.urut < 999 ? 1000 + best.urut : best.pr');
  });
});

describe("urutan baris alias Forkom 2", () => {
  it("baris ↳ memakai aturan urut yang sama", () => {
    const html = readFileSync("docs/prototipe-artifact.html", "utf8");
    expect(html).toContain('URUT_SEKSI.indexOf(j.seksi) > -1 && j.urut < 999 ? 1000 + j.urut : rankOf(ORDER.peran, j.peran)');
  });
});

describe("urutan alfabet di jabatan ber-urut Forkom 2", () => {
  it("rr >= 1000 diurutkan menurut nama, bukan tingkat", () => {
    const html = readFileSync("docs/prototipe-artifact.html", "utf8");
    expect(html.split("(a.rr >= 1000 ? 0 :").length - 1).toBe(2);
  });
});

describe("seksi ber-urut", () => {
  it("Alpha / TMCE ikut aturan urut jabatan", () => {
    const html = readFileSync("docs/prototipe-artifact.html", "utf8");
    expect(html).toContain('var URUT_SEKSI = ["Forkom 2", "Alpha / TMCE"];');
  });
});

describe("popup Umat: jabatan di BPK", () => {
  it("memakai jabatan pengurus periode aktif, kolom manual hanya cadangan", () => {
    const html = readFileSync("docs/prototipe-artifact.html", "utf8");
    expect(html).toContain('esc(jabA.length ? jabA.join(", ") : one(v[PV.jabBpk]))');
  });
});

describe("urutan sesama jabatan menurut No", () => {
  it("jabatan yang sama diurutkan menurut field No Pengurus BPK, dan dibaca dari Airtable", () => {
    const html = readFileSync("docs/prototipe-artifact.html", "utf8");
    expect(html).toContain('var F_PNG_NO = "fldGMEQMFCzzJEVAS"');
    expect(html).toContain("F_PNG_GRUP, F_PNG_NO]");
    expect(html).toContain("a.ck.localeCompare(b.ck) || (a.no - b.no)");
    expect(html).toContain("(a.ck || a.nama).localeCompare(b.ck || b.nama)");
  });
});
