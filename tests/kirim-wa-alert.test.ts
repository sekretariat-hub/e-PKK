import { it, expect, vi, beforeEach } from "vitest";

const KEY = "KUNCI-RAHASIA-TES-123";
let lapor: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules(); vi.unstubAllGlobals();
  delete process.env.BABLAST_API_KEY; delete process.env.BABLAST_SENDER_CODE; delete process.env.BABLAST_API_URL;
  process.env.AIRTABLE_TOKEN = "x";
  lapor = vi.fn(async () => {});
  vi.doMock("../src/lib/wa-alert", () => ({ laporWaGagal: lapor }));
});

it("kirimWa: gateway membalas 500 -> 502 dan peringatan dikirim dengan kode 502", async () => {
  process.env.BABLAST_API_KEY = KEY;
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));
  const { kirimWa } = await import("../src/lib/wa");
  await expect(kirimWa("628157005842", "halo")).rejects.toMatchObject({ status: 502 });
  expect(lapor).toHaveBeenCalledTimes(1);
  expect(lapor.mock.calls[0][0]).toBe(502);
});

it("kirimWa: gateway tidak menjawab (fetch melempar) -> 502 dan peringatan 502", async () => {
  process.env.BABLAST_API_KEY = KEY;
  vi.stubGlobal("fetch", async () => { throw new Error("ECONNREFUSED"); });
  const { kirimWa } = await import("../src/lib/wa");
  await expect(kirimWa("628157005842", "halo")).rejects.toMatchObject({ status: 502 });
  expect(lapor.mock.calls[0][0]).toBe(502);
});

it("kirimWa: API key belum diisi -> 503 dan peringatan 503", async () => {
  vi.stubGlobal("fetch", vi.fn());
  const { kirimWa } = await import("../src/lib/wa");
  await expect(kirimWa("628157005842", "halo")).rejects.toMatchObject({ status: 503 });
  expect(lapor.mock.calls[0][0]).toBe(503);
});

it("kirimWa: nomor tidak valid (400) TIDAK memicu peringatan", async () => {
  process.env.BABLAST_API_KEY = KEY;
  vi.stubGlobal("fetch", vi.fn());
  const { kirimWa } = await import("../src/lib/wa");
  await expect(kirimWa("123", "halo")).rejects.toMatchObject({ status: 400 });
  expect(lapor).not.toHaveBeenCalled();
});

it("kirimWa: sukses tidak memicu peringatan", async () => {
  process.env.BABLAST_API_KEY = KEY;
  vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
  const { kirimWa } = await import("../src/lib/wa");
  await kirimWa("628157005842", "halo");
  expect(lapor).not.toHaveBeenCalled();
});
