import { describe, it, expect } from "vitest";
import { renderDashboard } from "@/ui/render";

const acc: any = { email: "a@b.c", nama: "A", status: "Disetujui", level: "View", tabs: ["Dashboard", "Pengurus", "Event", "Inventaris", "Keuangan"] };

describe("tema BPN: token warna dan font", () => {
  const html = renderDashboard(acc);
  it("memakai palet navy, merah, emas dan latar BPN", () => {
    expect(html).toContain("--navy: #1E2F6B");
    expect(html).toContain("--red: #C62F2F");
    expect(html).toContain("--gold: #E8B923");
    expect(html).toContain("--bg: #F6F5FA");
  });
  it("memuat font Inter dan tidak lagi memakai aksen teal lama", () => {
    expect(html).toContain("family=Inter");
    expect(html).not.toContain("--accent: #0f5c63");
  });
});

describe("tema BPN: sidebar bergrup", () => {
  const html = renderDashboard({ ...acc, tabs: ["Dashboard"] });
  const at = (s: string) => { const i = html.indexOf(s); expect(i, s).toBeGreaterThan(-1); return i; };
  it("punya blok merek, kartu pengguna, dan fungsi penyembunyi grup kosong", () => {
    expect(html).toContain('class="sidebrand"');
    expect(html).toContain('class="sideme"');
    expect(html).toContain("function syncNavGroups");
  });
  it("urutan grup dan menu: Utama, Pelayanan, Kegiatan, Administrasi", () => {
    const u = at('data-grp="utama"'), p = at('data-grp="pelayanan"'), k = at('data-grp="kegiatan"'), a = at('data-grp="admin"');
    expect(u).toBeLessThan(at('id="tabbtn-beranda"'));
    expect(at('id="tabbtn-beranda"')).toBeLessThan(p);
    expect(p).toBeLessThan(at('id="tabbtn-pengurus"'));
    expect(at('id="tabbtn-umat"')).toBeLessThan(k);
    expect(k).toBeLessThan(at('id="tabbtn-kalender"'));
    expect(at('id="tabbtn-kep"')).toBeLessThan(a);
    for (const t of ["inventaris", "keuangan", "proker", "admin"]) expect(a).toBeLessThan(at(`id="tabbtn-${t}"`));
  });
});

describe("tema BPN: komponen", () => {
  const html = renderDashboard(acc);
  it("kartu angka punya lingkaran pastel di pojok dan kartu memakai radius var(--r)", () => {
    expect(html).toContain(".tile::after");
    expect(html).toContain(".summary { border-radius: var(--r)");
  });
  it("tombol utama navy dengan hover navy2, input membulat 12px", () => {
    expect(html).toContain(".btn.primary { background: var(--navy)");
    expect(html).toContain(".btn.primary:hover:not(:disabled) { background: var(--navy2)");
    expect(html).toContain(".fil input[type=\"search\"], .fil select, .dlg input, .dlg textarea, .dlg select { border-radius: 12px");
  });
});
