import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("docs/prototipe-artifact.html", "utf8");
const box = html.slice(html.indexOf("function kpAdminBox"), html.indexOf("function kepEvents"));

describe("UI SEP: persetujuan kegiatan baru", () => {
  it("tombol Setujui/Tolak hanya dibuat untuk peran tim dan hanya pada status Menunggu Persetujuan", () => {
    expect(box).toMatch(/Menunggu Persetujuan[\s\S]*w === "tim"[\s\S]*data-kpsetuju/);
    expect(box).toContain("data-kptolak");
  });
  it("selama menunggu, kartu link pendaftaran dan unggah Excel tidak ditampilkan", () => {
    expect(box).toMatch(/k\.status !== "Selesai" && k\.status !== "Menunggu Persetujuan" && k\.status !== "Ditolak"/);
  });
  it("klik tombol memanggil aksi setujui/tolak dengan kegiatanId, lalu memuat ulang", () => {
    expect(html).toContain('sepPost("setujui", { kegiatanId:');
    expect(html).toContain('sepPost("tolak", { kegiatanId:');
  });
  it("status yang ditampilkan di daftar memakai status sebenarnya (Menunggu Persetujuan/Ditolak)", () => {
    expect(html).toMatch(/function kpStat\(x\)[^\n]*Menunggu Persetujuan/);
  });
});
