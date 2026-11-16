import { describe, it, expect, vi, beforeEach } from "vitest";

let listPage: ReturnType<typeof vi.fn>;
let at: ReturnType<typeof vi.fn>;
let notifySuperadmins: ReturnType<typeof vi.fn>;
let mintaApproval: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  listPage = vi.fn(async () => ({ records: [] }));
  at = vi.fn(async () => ({}));
  notifySuperadmins = vi.fn(async () => {});
  mintaApproval = vi.fn(async () => ({ wa: 1, tanpaNomor: 0, gagal: 0 }));
  vi.doMock("../src/lib/airtable", () => ({ listPage, at }));
  vi.doMock("../src/lib/mail", () => ({ notifySuperadmins, appUrl: () => "https://e-pkk.test" }));
  vi.doMock("../src/lib/penerima", () => ({ emailsByJabatan: async () => ["sekre@x.com", "sekretariat@x.com"], RE_APPROVER_USER: /x/ }));
  vi.doMock("../src/lib/minta-approval", () => ({ mintaApproval }));
});

describe("registerLogin: user baru", () => {
  it("email baru: WA ke Sekretariat/Sekretaris dengan link halaman persetujuan, email Superadmin tetap dikirim", async () => {
    const { registerLogin } = await import("../src/lib/access");
    await registerLogin("Baru@X.com", "Budi");
    expect(notifySuperadmins).toHaveBeenCalledWith("baru@x.com", "Budi");
    expect(mintaApproval).toHaveBeenCalledTimes(1);
    const o = mintaApproval.mock.calls[0][0] as any;
    expect(o.jenis).toBe("user");
    expect(o.penerima).toEqual(["sekre@x.com", "sekretariat@x.com"]);
    expect(o.tautan).toBe("user:baru@x.com");
    expect(o.url).toBe("https://e-pkk.test/dashboard?kelola=1");
    expect(o.pesan).toContain("Budi");
    expect(o.pesan).toContain("baru@x.com");
  });

  it("login ulang akun yang sudah ada tidak memicu WA", async () => {
    listPage.mockResolvedValueOnce({ records: [{ id: "recAAAAAAAAAAAAAA", fields: { fldXCAPjc4bPkTbSq: "ada@x.com", fldRiPREBGEFPsyjW: "Disetujui", fldR7uM68NdmjWJdK: "Ada" } }] });
    const { registerLogin } = await import("../src/lib/access");
    await registerLogin("ada@x.com", "Ada");
    expect(mintaApproval).not.toHaveBeenCalled();
  });

  it("kegagalan mintaApproval tidak menggagalkan login", async () => {
    mintaApproval.mockRejectedValueOnce(new Error("boom"));
    const { registerLogin } = await import("../src/lib/access");
    await expect(registerLogin("baru@x.com", "Budi")).resolves.toBeUndefined();
  });

  it("nama kosong tetap menghasilkan pesan yang layak", async () => {
    const { registerLogin } = await import("../src/lib/access");
    await registerLogin("baru@x.com", "");
    expect((mintaApproval.mock.calls[0][0] as any).pesan).toContain("baru@x.com");
  });
});
