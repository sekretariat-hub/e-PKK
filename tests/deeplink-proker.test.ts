import { it, expect } from "vitest";
import { renderDashboard } from "@/ui/render";

const acc: any = { email: "a@b.c", nama: "A", status: "Disetujui", level: "Edit", tabs: ["Dashboard", "Program Kerja"] };
const ID = "recAAAAAAAAAAAAAA";
const me = (html: string) => { const m = /window\.__ME__ = (\{.*\});/.exec(html); return m ? JSON.parse(m[1]) : null; };

it("link ?proker=<id>: id valid dan akun punya tab Program Kerja -> openProker terisi", () => {
  expect(me(renderDashboard(acc, false, null, ID)).openProker).toBe(ID);
});
it("id tidak valid atau akun tanpa tab Program Kerja -> openProker kosong", () => {
  expect(me(renderDashboard(acc, false, null, "<script>x</script>")).openProker).toBe("");
  expect(me(renderDashboard({ ...acc, tabs: ["Dashboard"] }, false, null, ID)).openProker).toBe("");
  expect(me(renderDashboard(acc)).openProker).toBe("");
});

it("link ?tab=kep: hanya untuk akun yang punya tab KEP", () => {
  expect(me(renderDashboard({ ...acc, tabs: ["Dashboard", "KEP"] }, false, null, "", "kep")).openTab).toBe("kep");
  expect(me(renderDashboard(acc, false, null, "", "kep")).openTab).toBe("");
  expect(me(renderDashboard({ ...acc, tabs: ["KEP"] }, false, null, "", "lain")).openTab).toBe("");
});

it("link ?tab=luar: hanya untuk akun dengan tab Pewarta luar kota", () => {
  expect(me(renderDashboard({ ...acc, tabs: ["Pewarta luar kota"] }, false, null, "", "luar")).openTab).toBe("luar");
  expect(me(renderDashboard(acc, false, null, "", "luar")).openTab).toBe("");
});
