import { describe, it, expect } from "vitest";
import { renderDashboard } from "@/ui/render";

const acc: any = { email: "a@b.c", nama: "A", status: "Disetujui", level: "Edit", tabs: ["Dashboard", "Event"] };
const HTML = renderDashboard(acc);

// Ambil fungsi kelompok kehadiran langsung dari UI yang dikirim ke browser.
const src = HTML.match(/function hadirGrup\(p\) \{[\s\S]*?\n\}/)![0];
const hadirGrup: (p: { hadir?: string }) => string = new Function(src + "; return hadirGrup;")();

describe("tab Pendaftar: filter kehadiran", () => {
  it("memisahkan Hadir, Belum hadir, dan Go show dari teks Status Kehadiran Airtable", () => {
    expect(hadirGrup({ hadir: "✔️ Hadir" })).toBe("hadir");
    expect(hadirGrup({ hadir: "⭕ Belum Hadir" })).toBe("belum");
    expect(hadirGrup({ hadir: "✔️ Hadir GoShow" })).toBe("goshow");
    expect(hadirGrup({ hadir: "✔️ Hadir Go Show" })).toBe("goshow");
  });
  it("filter Hadir sudah termasuk Go show, filter Go show hanya Go show", () => {
    const cocok: (p: { hadir?: string }, k: string) => boolean = new Function(src + "; " + HTML.match(/function hadirCocok\(p, k\) \{[^\n]*\}/)![0] + "; return hadirCocok;")();
    expect(cocok({ hadir: "✔️ Hadir" }, "hadir")).toBe(true);
    expect(cocok({ hadir: "✔️ Hadir GoShow" }, "hadir")).toBe(true);
    expect(cocok({ hadir: "⭕ Belum Hadir" }, "hadir")).toBe(false);
    expect(cocok({ hadir: "✔️ Hadir" }, "goshow")).toBe(false);
    expect(cocok({ hadir: "✔️ Hadir GoShow" }, "goshow")).toBe(true);
  });
  it("teks kosong atau tak dikenal tidak masuk kelompok mana pun", () => {
    expect(hadirGrup({})).toBe("lain");
    expect(hadirGrup({ hadir: "" })).toBe("lain");
  });
  it("UI punya tombol Semua, Hadir, Belum hadir, Go show dan handler kliknya", () => {
    for (const t of ["Semua", "Hadir", "Belum hadir", "Go show"]) expect(HTML).toContain('"' + t + '"');
    expect(HTML).toContain('id="evHkChips"');
    expect(HTML).toContain("data-hk");
    expect(HTML).toContain("hadirCocok(p, hk)");
  });
});
