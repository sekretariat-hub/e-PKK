import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const KEY = "KUNCI-RAHASIA-TES-123";
let kirimEmail: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T10:00:00Z"));
  process.env.BABLAST_API_KEY = KEY;
  kirimEmail = vi.fn(async () => true);
  vi.doMock("../src/lib/mail", () => ({ kirimEmail }));
  vi.doMock("../src/lib/penerima", () => ({ emailsByJabatan: async () => ["sekre@x.com", "sekjen@x.com"], RE_ALERT: /x/ }));
});
afterEach(() => { vi.useRealTimers(); delete process.env.BABLAST_API_KEY; });

describe("laporWaGagal", () => {
  it("mengirim email ke penerima peringatan dengan kode status di subjek atau isi", async () => {
    const { laporWaGagal } = await import("../src/lib/wa-alert");
    await laporWaGagal(502, "gateway tidak menjawab");
    expect(kirimEmail).toHaveBeenCalledTimes(1);
    const [to, subject, text] = kirimEmail.mock.calls[0] as [string[], string, string];
    expect(to).toEqual(["sekre@x.com", "sekjen@x.com"]);
    expect(subject).toBe("[e-PKK] Pengiriman WhatsApp gagal");
    expect(text).toContain("502");
  });

  it("hanya satu email per jam per kode; kode lain punya jatah sendiri; lewat 1 jam boleh lagi", async () => {
    const { laporWaGagal } = await import("../src/lib/wa-alert");
    await laporWaGagal(502, "a");
    await laporWaGagal(502, "b");
    expect(kirimEmail).toHaveBeenCalledTimes(1);
    await laporWaGagal(503, "c");
    expect(kirimEmail).toHaveBeenCalledTimes(2);
    vi.setSystemTime(new Date("2026-11-16T11:00:01Z"));
    await laporWaGagal(502, "d");
    expect(kirimEmail).toHaveBeenCalledTimes(3);
  });

  it("email tidak memuat API key maupun nomor WA penuh", async () => {
    const { laporWaGagal } = await import("../src/lib/wa-alert");
    await laporWaGagal(502, `Gagal ke 628157005842 dengan kunci ${KEY}`);
    const text = (kirimEmail.mock.calls[0] as any)[2] as string;
    expect(text).not.toContain(KEY);
    expect(text).not.toContain("628157005842");
  });

  it("tidak melempar bila pengiriman email gagal, dan jatah tidak terpakai", async () => {
    kirimEmail.mockRejectedValueOnce(new Error("smtp mati"));
    const { laporWaGagal } = await import("../src/lib/wa-alert");
    await expect(laporWaGagal(502, "x")).resolves.toBeUndefined();
    await laporWaGagal(502, "y");
    expect(kirimEmail).toHaveBeenCalledTimes(2);
  });

  it("tidak mengirim email bila tidak ada penerima", async () => {
    vi.doMock("../src/lib/penerima", () => ({ emailsByJabatan: async () => [], RE_ALERT: /x/ }));
    const { laporWaGagal } = await import("../src/lib/wa-alert");
    await laporWaGagal(503, "x");
    expect(kirimEmail).not.toHaveBeenCalled();
  });
});
