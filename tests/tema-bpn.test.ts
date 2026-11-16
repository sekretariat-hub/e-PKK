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
