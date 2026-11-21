import { it, expect, vi, beforeEach } from "vitest";
import { AF } from "../src/lib/access";

const U1 = "recUUUUUUUUUUUUU1", U2 = "recUUUUUUUUUUUUU2";
let users: any[];
beforeEach(() => {
  vi.resetModules();
  process.env.AIRTABLE_TOKEN = "x";
  users = [
    { id: "recP1AAAAAAAAAAAA", fields: { [AF.email]: "Sek@x.com", [AF.status]: "Disetujui", [AF.jabLk]: ["Sekretaris"], [AF.umat]: [U1] } },
    { id: "recP2AAAAAAAAAAAA", fields: { [AF.email]: "sek@x.com", [AF.status]: "Disetujui", [AF.jabLk]: ["Sekretaris"] } }, // duplikat huruf kecil
    { id: "recP3AAAAAAAAAAAA", fields: { [AF.email]: "sj@x.com", [AF.status]: "Disetujui", [AF.jabLk]: ["Sekretaris Jenderal"], [AF.umat]: [U2] } },
    { id: "recP4AAAAAAAAAAAA", fields: { [AF.email]: "kor@x.com", [AF.status]: "Disetujui", [AF.jabLk]: ["Wakil Ketua 1", "Koordinator BPKPKK Bandung"] } },
    { id: "recP5AAAAAAAAAAAA", fields: { [AF.email]: "ketsek@x.com", [AF.status]: "Disetujui", [AF.jabLk]: ["Ketua Sekretariat"] } },
    { id: "recP6AAAAAAAAAAAA", fields: { [AF.email]: "tim@x.com", [AF.status]: "Disetujui", [AF.sepPeran]: "Tim SEP BPK" } },
    { id: "recP7AAAAAAAAAAAA", fields: { [AF.email]: "pic@x.com", [AF.status]: "Disetujui", [AF.sepPeran]: "PIC SEP Paroki" } },
    { id: "recP8AAAAAAAAAAAA", fields: { [AF.email]: "tunggu@x.com", [AF.status]: "Menunggu", [AF.jabLk]: ["Sekretaris"], [AF.sepPeran]: "Tim SEP BPK" } },
    { id: "recP9AAAAAAAAAAAA", fields: { [AF.email]: "lain@x.com", [AF.status]: "Disetujui", [AF.jabLk]: ["Bendahara"] } },
  ];
  vi.stubGlobal("fetch", async (u: any) => {
    const url = String(u);
    if (url.includes("/" + U1)) return new Response(JSON.stringify({ id: U1, fields: { fldzY1Z2QvIIEkYXR: "08157005842" } }), { status: 200 });
    if (url.includes("/" + U2)) return new Response(JSON.stringify({ id: U2, fields: {} }), { status: 200 });
    const f = new URL(url).searchParams.get("filterByFormula") || "";
    const rows = f.includes("Disetujui") ? users.filter((r) => r.fields[AF.status] === "Disetujui") : users;
    return new Response(JSON.stringify({ records: rows }), { status: 200 });
  });
});

it("emailsByJabatan: hanya akun Disetujui dengan jabatan cocok, huruf kecil, unik (user baru: hanya Ketua Sekretariat)", async () => {
  const { emailsByJabatan, RE_APPROVER_USER } = await import("../src/lib/penerima");
  expect(await emailsByJabatan(RE_APPROVER_USER)).toEqual(["ketsek@x.com"]);
});
it("RE_ALERT: Sekretaris, Sekretaris Jenderal, Koordinator BPK; bukan Bendahara", async () => {
  const { emailsByJabatan, RE_ALERT } = await import("../src/lib/penerima");
  expect((await emailsByJabatan(RE_ALERT)).sort()).toEqual(["kor@x.com", "sek@x.com", "sj@x.com"]);
});
it("emailsTimSep: hanya Tim SEP BPK yang Disetujui", async () => {
  const { emailsTimSep } = await import("../src/lib/penerima");
  expect(await emailsTimSep()).toEqual(["tim@x.com"]);
});
it("nomorWaOf: ambil dari umat yang ditautkan; kosong bila tak ada link atau nomor", async () => {
  const { nomorWaOf } = await import("../src/lib/penerima");
  expect(await nomorWaOf("SEK@x.com")).toBe("08157005842");
  expect(await nomorWaOf("kor@x.com")).toBe("");
  expect(await nomorWaOf("sj@x.com")).toBe("");
  expect(await nomorWaOf("tidak-ada@x.com")).toBe("");
});
