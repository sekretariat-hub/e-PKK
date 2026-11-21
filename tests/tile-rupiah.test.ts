import { describe, it, expect } from "vitest";
import { renderDashboard } from "@/ui/render";

const HTML = renderDashboard({ email: "a@b.c", nama: "A", status: "Disetujui", level: "Edit", tabs: ["Dashboard", "Event"] } as any);
const grab = (re: RegExp) => HTML.match(re)![0];
const rpNum: (v: any) => number = new Function(grab(/function rpNum\(v\) \{[^\n]*\}/) + "; return rpNum;")();
const eventRp: (e: any, regs: any[]) => number = new Function(grab(/function rpNum\(v\) \{[^\n]*\}/) + "; " + grab(/function eventRp\(e, regs\) \{[\s\S]*?\n\}/) + "; return eventRp;")();

describe("tile Confirmed / Paid memakai nilai rupiah", () => {
  it("harga event dari teks Airtable menjadi angka", () => {
    expect(rpNum("30000")).toBe(30000);
    expect(rpNum("Rp 30.000")).toBe(30000);
    expect(rpNum("")).toBe(0);
    expect(rpNum(undefined)).toBe(0);
  });
  it("122 pendaftar x Rp30.000 = Rp3.660.000", () => {
    const regs = Array.from({ length: 122 }, () => ({ kat: "" }));
    expect(eventRp({ harga: 30000, hargaOmk: 0 }, regs)).toBe(3660000);
  });
  it("harga OMK dipakai untuk kategori OMK bila diisi", () => {
    const regs = [{ kat: "Umum" }, { kat: "OMK" }];
    expect(eventRp({ harga: 30000, hargaOmk: 20000 }, regs)).toBe(50000);
    expect(eventRp({ harga: 30000, hargaOmk: 0 }, regs)).toBe(60000);
  });
  it("tile memakai rpFmt dan event membawa field harga", () => {
    expect(HTML).toContain("rpFmt(eventRp(e, regs))");
    expect(HTML).toContain('harga: "fldSALEmLll1QZZlZ"');
  });
});
