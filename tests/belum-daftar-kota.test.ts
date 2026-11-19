import { describe, it, expect } from "vitest";
import { renderDashboard } from "@/ui/render";

const acc: any = { email: "a@b.c", nama: "A", status: "Disetujui", level: "Edit", tabs: ["Dashboard", "Event", "PD"] };
const HTML = renderDashboard(acc);

// Ambil fungsi kelompok kota langsung dari UI yang dikirim ke browser.
const src = HTML.match(/var DALAM_KOTA = [\s\S]*?\nfunction kotaGrup\(p\) \{[\s\S]*?\n\}/)![0];
const kotaGrup: (p: { kota?: string[] }) => string = new Function(src + "; return kotaGrup;")();

describe("tab Belum mendaftar: kelompok dalam kota / luar kota", () => {
  it("Bandung, Cimahi, dan Bandung Raya masuk dalam kota", () => {
    for (const k of ["Bandung", "Cimahi", "Kota Bandung", "Kabupaten Bandung", "Bandung Barat", "Lembang", " cimahi "]) {
      expect(kotaGrup({ kota: [k] }), k).toBe("dalam");
    }
  });
  it("kota lain masuk luar kota", () => {
    for (const k of ["Purwakarta", "Karawang", "Cirebon", "Garut", "Tasikmalaya", "Cigugur", "Ciledug"]) {
      expect(kotaGrup({ kota: [k] }), k).toBe("luar");
    }
  });
  it("PD multi-kota: dalam kota bila salah satunya Bandung Raya", () => {
    expect(kotaGrup({ kota: ["Pamanukan", "Subang"] })).toBe("luar");
    expect(kotaGrup({ kota: ["Subang", "Bandung"] })).toBe("dalam");
  });
  it("kota kosong masuk kelompok sendiri", () => {
    expect(kotaGrup({ kota: [] })).toBe("kosong");
    expect(kotaGrup({})).toBe("kosong");
    expect(kotaGrup({ kota: [""] })).toBe("kosong");
  });
  it("UI punya tombol Semua, Dalam kota, Luar kota, Kota belum diisi dan handler kliknya", () => {
    for (const t of ["Semua", "Dalam kota", "Luar kota", "Kota belum diisi"]) expect(HTML).toContain('"' + t + '"');
    expect(HTML).toContain("data-bk");
    expect(HTML).toContain("function setEvBk");
    expect(HTML).toContain(".pdi[hidden]");
  });
});
