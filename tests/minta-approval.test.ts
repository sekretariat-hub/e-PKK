import { it, expect, vi, beforeEach, afterEach } from "vitest";

const buat = vi.hoisted(() => vi.fn(async (_p: string[], _m: string, _t: string) => {}));
const kirim = vi.hoisted(() => vi.fn(async (_n: string, _m: string) => {}));
const nomor = vi.hoisted(() => vi.fn(async (e: string) => ({ "a@x.com": "08157005842", "b@x.com": "0811223344", "c@x.com": "" } as any)[e] || ""));
vi.mock("../src/lib/notif", () => ({ buatNotif: buat }));
vi.mock("../src/lib/wa", () => ({ kirimWa: kirim }));
vi.mock("../src/lib/penerima", () => ({ nomorWaOf: nomor }));

const o = { jenis: "user" as const, penerima: ["a@x.com", "b@x.com"], pesan: "Pengguna baru Ani menunggu persetujuan.", tautan: "kelola", url: "https://e.example/dashboard?kelola=1" };
let logs: string[];
beforeEach(async () => {
  buat.mockClear(); kirim.mockReset(); kirim.mockResolvedValue(undefined); vi.resetModules(); vi.useFakeTimers();
  logs = [];
  vi.spyOn(console, "log").mockImplementation((...a) => { logs.push(a.join(" ")); });
  vi.spyOn(console, "error").mockImplementation((...a) => { logs.push(a.join(" ")); });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
async function load() { const m = await import("../src/lib/minta-approval"); m.jedaAntarKirim.ms = () => 0; return m; }

it("dua penerima: satu lonceng untuk keduanya, dua WA memuat url", async () => {
  const { mintaApproval } = await load();
  const r = await mintaApproval(o);
  expect(buat).toHaveBeenCalledTimes(1);
  expect(buat.mock.calls[0][0]).toEqual(["a@x.com", "b@x.com"]);
  expect(kirim).toHaveBeenCalledTimes(2);
  expect(kirim.mock.calls[0][1]).toContain(o.url);
  expect(kirim.mock.calls[0][1]).toContain(o.pesan);
  expect(r).toEqual({ wa: 2, tanpaNomor: 0, gagal: 0 });
});

it("panggilan kedua yang sama dalam 60 detik tidak mengirim ulang WA; setelah 61 detik mengirim lagi", async () => {
  const { mintaApproval } = await load();
  await mintaApproval(o);
  await mintaApproval(o);
  expect(kirim).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(61_000);
  await mintaApproval(o);
  expect(kirim).toHaveBeenCalledTimes(4);
});

it("permintaan berbeda (pesan lain) untuk penerima sama tidak ikut tertahan", async () => {
  const { mintaApproval } = await load();
  await mintaApproval(o);
  await mintaApproval({ ...o, pesan: "Pengguna baru Budi menunggu persetujuan." });
  expect(kirim).toHaveBeenCalledTimes(4);
});

it("kirimWa gagal untuk penerima pertama: yang kedua tetap dikirim, tidak melempar", async () => {
  kirim.mockRejectedValueOnce(Object.assign(new Error("Gagal mengirim WA (500)"), { status: 502 }));
  const { mintaApproval } = await load();
  const r = await mintaApproval(o);
  expect(kirim).toHaveBeenCalledTimes(2);
  expect(r).toEqual({ wa: 1, tanpaNomor: 0, gagal: 1 });
});

it("penerima tanpa nomor: tetap dapat lonceng, dihitung tanpaNomor, tanpa WA", async () => {
  const { mintaApproval } = await load();
  const r = await mintaApproval({ ...o, penerima: ["c@x.com"] });
  expect(buat).toHaveBeenCalledTimes(1);
  expect(kirim).not.toHaveBeenCalled();
  expect(r).toEqual({ wa: 0, tanpaNomor: 1, gagal: 0 });
});

it("log tidak pernah memuat nomor WA penuh", async () => {
  kirim.mockRejectedValue(Object.assign(new Error("gagal 08157005842"), { status: 502 }));
  const { mintaApproval } = await load();
  await mintaApproval(o);
  expect(logs.join("\n")).not.toMatch(/08157005842|628157005842|0811223344/);
});

it("tanpa penerima: tidak melakukan apa pun", async () => {
  const { mintaApproval } = await load();
  expect(await mintaApproval({ ...o, penerima: [] })).toEqual({ wa: 0, tanpaNomor: 0, gagal: 0 });
  expect(buat).not.toHaveBeenCalled();
});
