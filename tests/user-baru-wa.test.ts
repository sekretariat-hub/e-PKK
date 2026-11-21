import { it, expect, vi, beforeEach } from "vitest";

const minta = vi.hoisted(() => vi.fn(async (_o: any) => ({ wa: 1, tanpaNomor: 0, gagal: 0 })));
const rows = vi.hoisted(() => ({ list: [] as any[] }));
vi.mock("../src/lib/minta-approval", () => ({ mintaApproval: minta }));
vi.mock("../src/lib/penerima", () => ({ emailsByJabatan: async () => ["sek@x.com", "sekr@x.com"], RE_APPROVER_USER: /x/ }));
vi.mock("../src/lib/mail", () => ({ notifySuperadmins: vi.fn(async () => {}), appUrl: () => "https://e.example" }));
vi.mock("../src/lib/airtable", () => ({
  listPage: async () => ({ records: rows.list }),
  at: vi.fn(async () => ({})),
}));

beforeEach(() => { minta.mockClear(); minta.mockResolvedValue({ wa: 1, tanpaNomor: 0, gagal: 0 }); vi.resetModules(); rows.list = []; vi.spyOn(console, "error").mockImplementation(() => {}); });

it("email baru login -> mintaApproval jenis user ke Sekretariat/Sekretaris dengan link kelola", async () => {
  const { registerLogin } = await import("../src/lib/access");
  await registerLogin("Baru@X.com", "Ani Baru");
  expect(minta).toHaveBeenCalledTimes(1);
  const o = minta.mock.calls[0][0];
  expect(o).toMatchObject({ jenis: "user", penerima: ["sek@x.com", "sekr@x.com"], url: "https://e.example/dashboard?kelola=1" });
  expect(o.pesan).toContain("Ani Baru");
});

it("login ulang email yang sudah ada tidak memicu WA", async () => {
  rows.list = [{ id: "recAAAAAAAAAAAAAA", fields: { fldXCAPjc4bPkTbSq: "lama@x.com", fldRiPREBGEFPsyjW: "Disetujui" } }];
  const { registerLogin } = await import("../src/lib/access");
  await registerLogin("lama@x.com", "Lama");
  expect(minta).not.toHaveBeenCalled();
});

it("error di mintaApproval tidak menggagalkan login", async () => {
  minta.mockRejectedValue(new Error("boom"));
  const { registerLogin } = await import("../src/lib/access");
  await expect(registerLogin("baru2@x.com", "")).resolves.toBeUndefined();
});
