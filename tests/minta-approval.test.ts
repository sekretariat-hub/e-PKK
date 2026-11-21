import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let buatNotif: ReturnType<typeof vi.fn>;
let kirimWa: ReturnType<typeof vi.fn>;
let nomor: Record<string, string>;
let felicia: string[]; // pemegang jabatan Ketua Sekretariat = satu-satunya penerima WA

const base = { jenis: "proker" as const, pesan: "Program baru menunggu persetujuan Anda: Retret (Seksi Musik)", tautan: "proker:recAAAAAAAAAAAAAA", url: "https://e-pkk.example/dashboard?proker=recAAAAAAAAAAAAAA" };

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T10:00:00Z"));
  buatNotif = vi.fn(async () => {});
  kirimWa = vi.fn(async () => {});
  nomor = { "a@x.com": "081570058421", "b@x.com": "081234567890" };
  vi.doMock("../src/lib/notif", () => ({ buatNotif }));
  vi.doMock("../src/lib/wa", () => ({ kirimWa }));
  felicia = ["a@x.com"];
  vi.doMock("../src/lib/penerima", () => ({ nomorWaOf: async (e: string) => nomor[e] || "", emailsByJabatan: async () => felicia, RE_WA_APPROVAL: /x/ }));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

async function jalan(o: any) {
  const { mintaApproval } = await import("../src/lib/minta-approval");
  const p = mintaApproval(o);
  await vi.runAllTimersAsync();
  return p;
}

describe("mintaApproval", () => {
  it("lonceng sekali untuk semua penerima, tetapi WA HANYA ke pemegang Ketua Sekretariat, berisi pesan + url", async () => {
    const r = await jalan({ ...base, penerima: ["a@x.com", "b@x.com"] });
    expect(buatNotif).toHaveBeenCalledTimes(1);
    expect(buatNotif).toHaveBeenCalledWith(["a@x.com", "b@x.com"], base.pesan, base.tautan);
    expect(kirimWa).toHaveBeenCalledTimes(1);
    expect(kirimWa).toHaveBeenCalledWith("081570058421", base.pesan + "\n\n" + base.url);
    expect(r).toEqual({ wa: 1, tanpaNomor: 0, gagal: 0 });
  });

  it("penerima lain yang bukan Ketua Sekretariat tidak dikirimi WA; Ketua Sekretariat tetap dapat WA dan lonceng", async () => {
    await jalan({ ...base, penerima: ["b@x.com"] });
    expect(kirimWa).toHaveBeenCalledTimes(1);
    expect(kirimWa).toHaveBeenCalledWith("081570058421", base.pesan + "\n\n" + base.url);
    expect(buatNotif).toHaveBeenCalledWith(["b@x.com", "a@x.com"], base.pesan, base.tautan);
  });

  it("penerima kosong tetapi Ketua Sekretariat ada: tetap dapat lonceng dan WA", async () => {
    const r = await jalan({ ...base, penerima: [] });
    expect(buatNotif).toHaveBeenCalledWith(["a@x.com"], base.pesan, base.tautan);
    expect(r).toEqual({ wa: 1, tanpaNomor: 0, gagal: 0 });
  });

  it("permintaan yang sama ke penerima yang sama dalam 60 detik tidak dikirim ulang; setelah 61 detik boleh", async () => {
    await jalan({ ...base, penerima: ["a@x.com"] });
    await jalan({ ...base, penerima: ["a@x.com"] });
    expect(kirimWa).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-11-16T10:01:01Z"));
    await jalan({ ...base, penerima: ["a@x.com"] });
    expect(kirimWa).toHaveBeenCalledTimes(2);
  });

  it("dua permintaan BERBEDA ke penerima yang sama sama-sama dikirim", async () => {
    await jalan({ ...base, penerima: ["a@x.com"] });
    await jalan({ ...base, tautan: "proker:recBBBBBBBBBBBBBB", url: "https://e-pkk.example/x", penerima: ["a@x.com"] });
    expect(kirimWa).toHaveBeenCalledTimes(2);
  });

  it("kegagalan satu penerima tidak menghentikan yang lain dan tidak melempar", async () => {
    felicia = ["a@x.com", "b@x.com"];
    kirimWa.mockRejectedValueOnce(Object.assign(new Error("gateway mati"), { status: 502 }));
    const r = await jalan({ ...base, penerima: ["a@x.com", "b@x.com"] });
    expect(kirimWa).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ wa: 1, tanpaNomor: 0, gagal: 1 });
  });

  it("penerima tanpa nomor atau nomor tidak valid: lonceng tetap dibuat, dihitung tanpaNomor, bukan gagal", async () => {
    felicia = ["a@x.com", "tanpa@x.com"];
    kirimWa.mockRejectedValueOnce(Object.assign(new Error("Nomor WA tidak valid."), { status: 400 }));
    const r = await jalan({ ...base, penerima: ["a@x.com", "tanpa@x.com"] });
    expect(buatNotif).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ wa: 0, tanpaNomor: 2, gagal: 0 });
  });

  it("tidak ada penerima sama sekali: tidak ada lonceng dan tidak ada WA", async () => {
    felicia = [];
    const r = await jalan({ ...base, penerima: [] });
    expect(buatNotif).not.toHaveBeenCalled();
    expect(kirimWa).not.toHaveBeenCalled();
    expect(r).toEqual({ wa: 0, tanpaNomor: 0, gagal: 0 });
  });

  it("log tidak pernah memuat nomor WA penuh", async () => {
    const out: string[] = [];
    for (const k of ["log", "error", "warn"] as const) vi.spyOn(console, k).mockImplementation((...a: any[]) => { out.push(a.join(" ")); });
    kirimWa.mockRejectedValueOnce(Object.assign(new Error("gagal ke 081570058421"), { status: 502 }));
    await jalan({ ...base, penerima: ["a@x.com"] });
    expect(out.join("\n")).not.toContain("081570058421");
  });

  it("penerima ganda (huruf besar-kecil berbeda) hanya sekali", async () => {
    await jalan({ ...base, penerima: ["A@x.com", "a@x.com"] });
    expect(kirimWa).toHaveBeenCalledTimes(1);
  });
});
