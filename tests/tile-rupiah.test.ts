import { describe, it, expect } from "vitest";
import { renderDashboard } from "@/ui/render";

const HTML = renderDashboard({ email: "a@b.c", nama: "A", status: "Disetujui", level: "Edit", tabs: ["Dashboard", "Event"] } as any);

describe("tile Confirmed / Paid: nilai rupiah uang masuk", () => {
  it("tampilan memanggil /api/event-uangmasuk dan memakai format rupiah", () => {
    expect(HTML).toContain("/api/event-uangmasuk");
    expect(HTML).toContain("function rpFmt");
    expect(HTML).toContain('data-evrp="');
  });
  it("tanpa hak Keuangan (respons gagal) tile menampilkan tanda strip", () => {
    const src = HTML.match(/function rpFmt\(n\) \{[^\n]*\}\nfunction evRpText\(c\) \{[^\n]*\}/)![0];
    const evRpText: (c: any) => string = new Function(src + "; return evRpText;")();
    expect(evRpText(undefined)).toBe("…");
    expect(evRpText(null)).toBe("–");
    expect(evRpText({ total: 240000 }).replace(/\s/g, "")).toMatch(/^Rp240[.,]000$/);
  });
});
