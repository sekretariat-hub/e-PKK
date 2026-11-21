import { it, expect, vi, beforeEach, afterEach } from "vitest";

const kirim = vi.hoisted(() => vi.fn(async () => true));
vi.mock("../src/lib/mail", async (orig) => ({ ...(await orig<any>()), kirimEmail: kirim }));
vi.mock("../src/lib/penerima", async (orig) => ({ ...(await orig<any>()), emailsByJabatan: async () => ["sek@x.com", "sj@x.com"] }));

const KEY = "KUNCI-RAHASIA-TES-123";
beforeEach(() => { kirim.mockReset(); kirim.mockResolvedValue(true as any); vi.resetModules(); vi.useFakeTimers(); process.env.BABLAST_API_KEY = KEY; });
afterEach(() => vi.useRealTimers());

it("dua kali 502 dalam satu jam -> satu email; 503 punya jatah sendiri; setelah 1 jam boleh lagi", async () => {
  const { laporWaGagal } = await import("../src/lib/wa-alert");
  await laporWaGagal(502, "gateway mati");
  await laporWaGagal(502, "gateway mati lagi");
  expect(kirim).toHaveBeenCalledTimes(1);
  await laporWaGagal(503, "belum dikonfigurasi");
  expect(kirim).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(61 * 60_000);
  await laporWaGagal(502, "gateway mati");
  expect(kirim).toHaveBeenCalledTimes(3);
});

it("email memuat kode status dan tidak memuat API key atau nomor penuh", async () => {
  const { laporWaGagal } = await import("../src/lib/wa-alert");
  await laporWaGagal(502, `Gagal (500) ${KEY} ke 628157005842`);
  const [to, subject, text] = kirim.mock.calls[0] as any;
  expect(to).toEqual(["sek@x.com", "sj@x.com"]);
  expect(subject).toBe("[e-PKK] Pengiriman WhatsApp gagal");
  expect(text).toContain("502");
  expect(text).not.toContain(KEY);
  expect(text).not.toContain("628157005842");
});

it("bila kirimEmail melempar, laporWaGagal tetap selesai tanpa error", async () => {
  kirim.mockRejectedValue(new Error("smtp mati"));
  const { laporWaGagal } = await import("../src/lib/wa-alert");
  await expect(laporWaGagal(503, "x")).resolves.toBeUndefined();
});
