import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { UMAT_EDIT_JS } from "@/ui/umat-edit-js";
import { renderDashboard } from "@/ui/render";

const FLD = { baptis: "fld0P7TE88KvYXORT", nama: "fldIpQTSkFB9sU0lo", pang: "fld469PYR80nAUNIF", wa: "fldzY1Z2QvIIEkYXR", lain: "fldsVrUbWf6iT5Jja", email: "fldAaQ3zmiLBhp4z9", tgl: "fldXGHvqnezzKZSCp", jk: "fldxpeouH1hcxMzNc", alamat: "fldcQFzBtr9EELTtV", pd: "fldrHJ6q3HZvApccl", paroki: "fldE62NyXuSJLvM8h", libat: "fldQQpyVKX2eZGokY", kual: "fldwywmGiZMscPgKq", alumni: "fld8wFTduClZ9Y5Al", hapus: "fldxZvnqVvAH4aWyd" };
const META = { jk: ["Pria", "Wanita"], libat: ["Pengurus BPK", "Pewarta BPK"], kualifikasi: ["Pewarta Pengajar", "Imam"], alumni: ["KEP Paroki"], pd: [{ id: "recPD1", nama: "PD Satu" }], paroki: [{ id: "recPar1", nama: "Paroki Satu" }] };
const FULL = { [FLD.baptis]: "Maria", [FLD.nama]: "A.Sariyani", [FLD.pang]: "Yani", [FLD.wa]: "6287785634922", [FLD.lain]: "6287785634922", [FLD.email]: "yani@example.com", [FLD.tgl]: "1971-07-10", [FLD.jk]: { name: "Wanita" }, [FLD.alamat]: "Jln. Laswi", [FLD.pd]: [{ id: "recPD1", name: "PD Satu" }], [FLD.paroki]: [{ id: "recPar1", name: "Paroki Satu" }], [FLD.libat]: [{ name: "Pewarta BPK" }] };
const tick = () => new Promise((r) => setTimeout(r, 30));

async function boot(record: any = FULL) {
  const dom = new JSDOM('<body><table><tbody id="uaBody"></tbody></table></body>', { runScripts: "outside-only", url: "https://e.test/" });
  const w: any = dom.window;
  const calls: any[] = [];
  w.fetch = vi.fn(async (u: string, init: any = {}) => {
    if (String(u).includes("/api/umat-form")) return { ok: true, status: 200, json: async () => META };
    const b = JSON.parse(init.body); calls.push(b);
    if (b.tool === "list_records_for_table") return { ok: true, status: 200, json: async () => ({ records: [{ id: "rec1", cellValuesByFieldId: record }] }) };
    return { ok: true, status: 200, json: async () => ({ records: [] }) };
  });
  w.__ME__ = { level: "Superadmin", tabs: ["umat"] };
  w.EPK = {
    el(tag: string, props: any = {}, kids: any[] = []) {
      const e = w.document.createElement(tag);
      Object.keys(props || {}).forEach((k) => { if (k === "text") e.textContent = props[k]; else if (k === "class") e.className = props[k]; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), props[k]); else if (props[k] != null) e.setAttribute(k, props[k]); });
      (kids || []).forEach((c: any) => { if (c != null) e.appendChild(typeof c === "string" ? w.document.createTextNode(c) : c); });
      return e;
    },
    modal(title: string, body: any) { const m = w.document.createElement("div"); m.id = "epkModal"; m.appendChild(body); w.document.body.appendChild(m); return { close: () => m.remove(), box: m }; },
  };
  w.D = { ua: [{ id: "rec1", nama: "A.Sariyani", pang: "Yani", pd: "PD Satu" }] };
  w.renderUmat = vi.fn();
  w.eval(UMAT_EDIT_JS);
  w.document.getElementById("uaBody").innerHTML = '<tr><td><span class="acts"><button class="act" data-ua="rec1">View</button><a class="act">Email</a></span></td></tr>';
  await tick();
  return { w, calls };
}
const q = (w: any, f: string) => w.document.querySelector('[data-f="' + f + '"]');
async function open(w: any) { w.document.querySelector("[data-ua-edit]").click(); await tick(); }
const updates = (calls: any[]) => calls.filter((c) => c.tool === "update_records_for_table");

describe("render", () => {
  const acc = (o: any) => ({ email: "a@b.c", nama: "A", status: "Disetujui", tabs: ["Umat"], level: "Superadmin", ...o }) as any;
  it("skrip hanya dimuat untuk Superadmin dengan tab Umat, bukan Lihat sebagai", () => {
    expect(renderDashboard(acc({}))).toContain("data-ua-edit");
    expect(renderDashboard(acc({ level: "Edit" }))).not.toContain("data-ua-edit");
    expect(renderDashboard(acc({ level: "View" }))).not.toContain("data-ua-edit");
    expect(renderDashboard(acc({ viewAs: "x@y.z" }))).not.toContain("data-ua-edit");
    expect(renderDashboard(acc({ tabs: ["Dashboard"] }))).not.toContain("data-ua-edit");
  });
});

describe("dialog Edit umat", () => {
  it("tombol Edit muncul di baris, di antara View dan Email", async () => {
    const { w } = await boot();
    const kids = [...w.document.querySelectorAll(".acts > *")].map((e: any) => e.textContent.trim());
    expect(kids).toEqual(["View", "Edit", "Email"]);
  });
  it("membuka dialog dengan 15 isian terisi", async () => {
    const { w } = await boot();
    await open(w);
    expect(q(w, FLD.nama).value).toBe("A.Sariyani");
    expect(q(w, FLD.baptis).value).toBe("Maria");
    expect(q(w, FLD.tgl).value).toBe("1971-07-10");
    expect(w.document.querySelector('[data-f="' + FLD.jk + '"]:checked').value).toBe("Wanita");
    expect(q(w, FLD.pd).value).toBe("recPD1");
    expect(q(w, FLD.paroki).value).toBe("recPar1");
    expect(w.document.querySelector('[data-f="' + FLD.libat + '"][value="Pewarta BPK"]').checked).toBe(true);
    expect(w.document.querySelectorAll("[data-f]").length).toBeGreaterThanOrEqual(15);
  });
  it("hanya mengirim field yang berubah", async () => {
    const { w, calls } = await boot();
    await open(w);
    q(w, FLD.baptis).value = "Yosef";
    w.document.querySelector('[data-act="simpan"]').click(); await tick();
    expect(updates(calls).length).toBe(1);
    expect(updates(calls)[0].input.records).toEqual([{ id: "rec1", fields: { [FLD.baptis]: "Yosef" } }]);
  });
  it("mengosongkan Email dan Paroki mengirim null dan []", async () => {
    const { w, calls } = await boot();
    await open(w);
    q(w, FLD.email).value = ""; q(w, FLD.paroki).value = "";
    w.document.querySelector('[data-act="simpan"]').click(); await tick();
    expect(updates(calls)[0].input.records[0].fields).toEqual({ [FLD.email]: null, [FLD.paroki]: [] });
  });
  it("Nama kosong tidak mengirim apa pun dan menampilkan pesan", async () => {
    const { w, calls } = await boot();
    await open(w);
    q(w, FLD.nama).value = "";
    w.document.querySelector('[data-act="simpan"]').click(); await tick();
    expect(updates(calls).length).toBe(0);
    expect(w.document.querySelector('[role="alert"]').textContent).toMatch(/Nama/);
  });
  it("klik Simpan dua kali beruntun hanya satu permintaan", async () => {
    const { w, calls } = await boot();
    await open(w);
    q(w, FLD.baptis).value = "Yosef";
    const b = w.document.querySelector('[data-act="simpan"]'); b.click(); b.click(); await tick();
    expect(updates(calls).length).toBe(1);
  });
  it("umat tanpa PD dan Paroki membuka dialog tanpa error", async () => {
    const { w } = await boot({ [FLD.nama]: "B", [FLD.wa]: "08", [FLD.jk]: { name: "Pria" } });
    await open(w);
    expect(q(w, FLD.pd).value).toBe("");
    expect(q(w, FLD.paroki).value).toBe("");
  });
  it("sukses memperbarui D.ua, memanggil renderUmat, dan menutup dialog", async () => {
    const { w } = await boot();
    await open(w);
    q(w, FLD.pang).value = "Ani";
    w.document.querySelector('[data-act="simpan"]').click(); await tick();
    expect(w.D.ua[0].pang).toBe("Ani");
    expect(w.renderUmat).toHaveBeenCalled();
    expect(w.document.getElementById("epkModal")).toBeNull();
  });
  it("Hapus? dicentang membuang baris dari D.ua", async () => {
    const { w, calls } = await boot();
    await open(w);
    q(w, FLD.hapus).checked = true;
    w.document.querySelector('[data-act="simpan"]').click(); await tick();
    expect(updates(calls)[0].input.records[0].fields).toEqual({ [FLD.hapus]: true });
    expect(w.D.ua.length).toBe(0);
  });
});
