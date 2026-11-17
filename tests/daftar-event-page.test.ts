import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { GET } from "@/app/daftar-event/[token]/route";
import { buatTokenDaftar } from "@/lib/daftar-event";

const info = { nama: "Training Alpha Bandung", tgl: "Senin, 14 Desember 2026", tutup: "11 Desember 2026, Pukul 21:00", buka: true, alasan: "", kontak: "Ivone Chow +62 811-217-036", jabatan: ["Koordinator PD", "Sekretaris", "Lainnya"], pd: [{ id: "recPD000000000001", nama: "PD Satu" }] };
const umat = { umat: [
  { id: "recU0000000000001", nama: "Ani Wijaya", pd: "PD Satu", pgl: "Ani", ada: false },
  { id: "recU0000000000002", nama: "Budi Santoso", pd: "PD Dua", pgl: "", ada: true },
  { id: "recU0000000000003", nama: "Cosmas Winoto P", pd: "", pgl: "", ada: false },
] };

async function buka() {
  process.env.AUTH_SECRET = "rahasia";
  const token = buatTokenDaftar("recEVENT00000000A");
  const res = await GET(new Request("http://t.test/daftar-event/" + token), { params: Promise.resolve({ token }) });
  const posts: any[] = [];
  const dom = new JSDOM(await res.text(), { runScripts: "dangerously", url: "http://t.test/x", beforeParse(w: any) {
    w.fetch = async (_u: string, init: any) => { const b = JSON.parse(init.body); posts.push(b); return { ok: true, json: async () => (b.aksi === "info" ? info : b.aksi === "umat" ? umat : { ok: true, nama: "Ani Wijaya" }) }; };
  } });
  await new Promise((r) => setTimeout(r, 20));
  const w = dom.window as any;
  return { w, d: w.document, posts, ketik: (v: string) => { const i = w.document.getElementById("sq"); i.value = v; i.dispatchEvent(new w.Event("input")); } };
}

describe("halaman pendaftaran event", () => {
  beforeEach(() => { process.env.AUTH_SECRET = "rahasia"; });
  it("token palsu: 404", async () => {
    const res = await GET(new Request("http://t.test/x"), { params: Promise.resolve({ token: "recEVENT00000000A.palsu" }) });
    expect(res.status).toBe(404);
  });
  it("menampilkan judul, batas tutup, dan jabatan seperti Fillout", async () => {
    const { d } = await buka();
    expect(d.getElementById("t1").textContent).toBe("Training Alpha Bandung");
    expect(d.getElementById("t3").textContent).toContain("ditutup pada 11 Desember 2026, Pukul 21:00");
    expect(d.querySelectorAll("#jab input").length).toBe(3);
    expect(d.getElementById("sl").hidden).toBe(false);
    expect(d.getElementById("kt").textContent).toBe("Jika ada pertanyaan bisa hubungi Ivone Chow +62 811-217-036");
  });
  it("+Add menampilkan nama berurutan; yang sudah terdaftar tidak bisa dipilih", async () => {
    const { d } = await buka();
    d.getElementById("add").click();
    const nama = [...d.querySelectorAll("#lst .it b")].map((x: any) => x.textContent);
    expect(nama).toEqual(["Ani Wijaya", "Budi Santoso", "Cosmas Winoto P"]);
    expect(d.querySelectorAll("#lst .it.off").length).toBe(1);
    expect(d.getElementById("cn").hidden).toBe(true);
  });
  it("Create new disembunyikan selama ada nama yang cocok; muncul hanya bila tidak ada", async () => {
    const { d, ketik } = await buka();
    d.getElementById("add").click();
    ketik("cosmas");
    expect(d.getElementById("cn").hidden).toBe(true);
    expect(d.getElementById("blk").hidden).toBe(false);
    ketik("ani"); // cocok lewat panggilan juga
    expect(d.getElementById("cn").hidden).toBe(true);
    ketik("zzzz tidak ada");
    expect(d.getElementById("cn").hidden).toBe(false);
  });
  it("memilih nama lalu Daftar mengirim id umat, jabatan, dan aktif", async () => {
    const { d, posts, w, ketik } = await buka();
    d.getElementById("add").click(); ketik("ani");
    d.querySelector("#lst [data-id]").click();
    expect(d.getElementById("go").disabled).toBe(false);
    d.getElementById("akt").click();
    d.querySelector("#jab input[value=Sekretaris]").click();
    d.getElementById("f").dispatchEvent(new w.Event("submit", { cancelable: true }));
    await new Promise((r) => setTimeout(r, 10));
    const b = posts.find((p) => p.aksi === "kirim");
    expect(b).toMatchObject({ umat: "recU0000000000001", aktif: true, jabatan: ["Sekretaris"] });
    expect(d.getElementById("top").textContent).toContain("sudah kami terima");
  });
});
