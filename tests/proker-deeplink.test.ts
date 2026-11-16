import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { PROKER_JS } from "@/ui/proker-js";

const tunggu = () => new Promise((r) => setTimeout(r, 25));
async function boot(hash: string, withTab = true) {
  const dom = new JSDOM(`<body>${withTab ? '<button id="tabbtn-proker"></button>' : ""}<div id="proTiles"></div><p id="proMsg"></p></body>`, { url: "https://e-pkk.test/dashboard" + hash, runScripts: "outside-only" });
  const w: any = dom.window;
  w.__ME__ = { viewAs: false };
  w.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ programs: [], bisaSetuju: false }) }));
  w.EPK = { el: (tag: string) => w.document.createElement(tag) };
  let diklik = 0;
  w.document.getElementById("tabbtn-proker")?.addEventListener("click", () => { diklik++; });
  w.eval(PROKER_JS);
  await tunggu(); // klik ditunda satu putaran supaya pemasang handler tab lain sudah siap
  return { w, diklik: () => diklik };
}

describe("tautan dalam #proker:<id> dari WA", () => {
  it("membuka tab Program Kerja dan menandai program yang harus dibuka", async () => {
    const { w, diklik } = await boot("#proker:recAAAAAAAAAAAAAA");
    expect(diklik()).toBe(1);
    expect(w.__PROKER_OPEN).toBe("recAAAAAAAAAAAAAA");
  });
  it("hash lain atau id tidak valid diabaikan", async () => {
    for (const h of ["", "#kep", "#proker:abc", "#proker:recAAAAAAAAAAAAAA<script>"]) {
      const { w, diklik } = await boot(h);
      expect(diklik(), h).toBe(0);
      expect(w.__PROKER_OPEN, h).toBeFalsy();
    }
  });
  it("tanpa tombol tab (akun tanpa akses) tidak error dan tidak menandai apa pun", async () => {
    const { w } = await boot("#proker:recAAAAAAAAAAAAAA", false);
    expect(w.__PROKER_OPEN).toBeFalsy();
  });
});
