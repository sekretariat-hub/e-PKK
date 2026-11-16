import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() }));

describe("halaman masuk gaya BPN", () => {
  it("menampilkan logo BPK, nama sistem, login nomor WA, dan tombol Google", async () => {
    const { default: Masuk } = await import("@/app/masuk/page");
    const html = renderToStaticMarkup(await Masuk({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('src="/logo.png"');
    expect(html).toContain("BPK PKK Bandung");
    expect(html).toContain("Masuk dengan Google");
    expect(html).toContain("Nomor WhatsApp");
    expect(html).toContain('autoComplete="tel"');
    expect(html).toContain("persetujuan sekretariat");
  });
});
