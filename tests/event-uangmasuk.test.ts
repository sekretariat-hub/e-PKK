import { describe, it, expect, vi, beforeEach } from "vitest";

let sesi: string | null = "u@x.com";
let akun: any = null;
let boleh = true;
vi.mock("@/auth", () => ({ auth: async () => (sesi ? { user: { email: sesi } } : null) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/viewas", () => ({ AS_COOKIE: "epk_as", effectiveAccess: async () => ({ real: akun, acc: akun }) }));
vi.mock("@/lib/keuangan-akses", () => ({
  pastikanKeuangan: async () => {
    if (!boleh) { const { HttpError } = await import("@/lib/policy"); throw new HttpError(403, "Menu Keuangan hanya untuk Bendahara."); }
  },
}));
vi.mock("@/lib/airtable", () => ({
  at: vi.fn(), listPage: vi.fn(), getRecord: vi.fn(), resolveLinks: async (_b: string, _t: string, r: any[]) => r,
  listUntil: vi.fn(async (_b: string, table: string) => table === "tblBYQhtvQy6woPnJ"
    ? { records: [
        { id: "recBENEV1", fields: { fldTFmgAlLusxT12N: "42-From Prayer to Mission 21 Nov 2026", fldVvS9jO3fqwsNi6: ["recEVENT00000000A"] } },
        { id: "recBENEV2", fields: { fldTFmgAlLusxT12N: "32-Pelatihan musik", fldVvS9jO3fqwsNi6: ["recLAIN000000000X"] } },
      ] }
    : { records: [
        { id: "m1", fields: { fldlulESHSCxybfET: 30000, fldj3EnmRXMpV6iAS: ["recBENEV1"], fldTTm47NgkHZkaNs: { name: "Transaksi Masuk" } } },
        { id: "m2", fields: { fldlulESHSCxybfET: 210000, fldj3EnmRXMpV6iAS: ["recBENEV1"], fldTTm47NgkHZkaNs: { name: "Transaksi Masuk" } } },
        { id: "m3", fields: { fldlulESHSCxybfET: 99999, fldj3EnmRXMpV6iAS: ["recBENEV1"], fldTTm47NgkHZkaNs: { name: "Transaksi Masuk" }, fld9nzDRIQgTg1Mtz: true } }, // dicentang Hapus
        { id: "m4", fields: { fldlulESHSCxybfET: 100000, fldj3EnmRXMpV6iAS: ["recBENEV2"], fldTTm47NgkHZkaNs: { name: "Transaksi Masuk" } } }, // event lain
        { id: "m5", fields: { fldlulESHSCxybfET: 50000, fldj3EnmRXMpV6iAS: ["recBENEV1"], fldTTm47NgkHZkaNs: { name: "Transaksi Keluar" } } }, // bukan uang masuk
      ] }),
}));
import { POST } from "@/app/api/event-uangmasuk/route";

const req = (body: any) => new Request("http://x/api/event-uangmasuk", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { sesi = "u@x.com"; boleh = true; akun = { email: "u@x.com", status: "Disetujui", level: "Edit", tabs: ["Event"], jabatan: "Bendahara" }; });

describe("api/event-uangmasuk", () => {
  it("menjumlah hanya Transaksi Masuk event itu, tanpa yang dicentang Hapus", async () => {
    const r = await POST(req({ event: "recEVENT00000000A" }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ total: 240000, jumlah: 2, tercatat: true });
  });
  it("event tanpa pasangan di base Bendahara: tercatat false, total 0", async () => {
    const r = await POST(req({ event: "recTIDAKADA000000" }));
    expect(await r.json()).toEqual({ total: 0, jumlah: 0, tercatat: false });
  });
  it("ditolak 403 bila tidak berhak Keuangan", async () => {
    boleh = false;
    expect((await POST(req({ event: "recEVENT00000000A" }))).status).toBe(403);
  });
  it("ditolak 403 tanpa akses menu Event, 401 tanpa login, 400 bila id tidak valid", async () => {
    akun = { ...akun, tabs: ["Dashboard"] };
    expect((await POST(req({ event: "recEVENT00000000A" }))).status).toBe(403);
    akun = { ...akun, tabs: ["Event"] };
    expect((await POST(req({ event: "bukan-id" }))).status).toBe(400);
    sesi = null;
    expect((await POST(req({ event: "recEVENT00000000A" }))).status).toBe(401);
  });
});
