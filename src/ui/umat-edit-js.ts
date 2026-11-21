// Skrip antarmuka Edit data umat. Hanya dikirim ke browser Superadmin (lihat render.ts); penegakan hak tetap di /api/airtable (policy.ts).
export const UMAT_EDIT_JS = String.raw`
(function () {
  var BASE = "appIGR8Duhj3Vsz48", TBL = "tblwRNtXSVzgzVXuk";
  var F = { baptis: "fld0P7TE88KvYXORT", nama: "fldIpQTSkFB9sU0lo", pang: "fld469PYR80nAUNIF", wa: "fldzY1Z2QvIIEkYXR", lain: "fldsVrUbWf6iT5Jja", email: "fldAaQ3zmiLBhp4z9", tgl: "fldXGHvqnezzKZSCp", jk: "fldxpeouH1hcxMzNc", alamat: "fldcQFzBtr9EELTtV", pd: "fldrHJ6q3HZvApccl", paroki: "fldE62NyXuSJLvM8h", libat: "fldQQpyVKX2eZGokY", kual: "fldwywmGiZMscPgKq", alumni: "fld8wFTduClZ9Y5Al", hapus: "fldxZvnqVvAH4aWyd" };
  var ORDER = ["baptis", "nama", "pang", "wa", "lain", "email", "tgl", "jk", "alamat", "pd", "paroki", "libat", "kual", "alumni", "hapus"];
  var IDS = ORDER.map(function (k) { return F[k]; });
  var meta = null, busy = false;

  function api(tool, input) {
    return fetch("/api/airtable", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: tool, input: input }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || "Gagal."); return j; }); });
  }
  function getMeta() {
    if (!meta) meta = fetch("/api/umat-form").then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || "Gagal memuat pilihan."); return j; }); });
    meta.catch(function () { meta = null; });
    return meta;
  }
  function nm(x) { return x && typeof x === "object" ? (x.name != null ? x.name : x.id) : x; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function kosong(v) { return v == null || (typeof v === "string" && !v.trim()); }

  function initial(v, m) {
    var o = {};
    ["baptis", "nama", "pang", "wa", "lain", "email", "alamat"].forEach(function (k) { o[F[k]] = v[F[k]] == null ? "" : String(v[F[k]]); });
    o[F.tgl] = String(v[F.tgl] || "").slice(0, 10);
    o[F.jk] = String(nm(v[F.jk]) || "");
    o[F.kual] = String(nm(v[F.kual]) || "");
    [F.pd, F.paroki].forEach(function (id) { var a = arr(v[id]); o[id] = a.length ? String(a[0] && a[0].id ? a[0].id : a[0]) : ""; });
    [[F.libat, m.libat], [F.alumni, m.alumni]].forEach(function (p) {
      var names = arr(v[p[0]]).map(function (x) { return String(nm(x)); }), pos = function (n) { var i = p[1].indexOf(n); return i < 0 ? 999 : i; };
      o[p[0]] = names.sort(function (a, b) { return pos(a) - pos(b); }); /* urutan sama dengan daftar pilihan, supaya tidak dianggap berubah */
    });
    o[F.hapus] = v[F.hapus] === true;
    return o;
  }
  function problem(c) {
    if (kosong(c[F.nama])) return "Nama Lengkap wajib diisi.";
    if (kosong(c[F.wa])) return "No Whatsapp Aktif wajib diisi.";
    if (kosong(c[F.jk])) return "Jenis Kelamin wajib dipilih.";
    if (!kosong(c[F.email]) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(c[F.email]).trim())) return "Email tidak valid.";
    if (!kosong(c[F.tgl]) && !/^\d{4}-\d{2}-\d{2}$/.test(c[F.tgl])) return "Tanggal Lahir tidak valid.";
    return "";
  }
  function toApi(id, v) {
    if (id === F.pd || id === F.paroki) return v ? [v] : [];
    if (id === F.libat || id === F.alumni || id === F.hapus) return v;
    if (typeof v === "string") { v = v.trim(); return v === "" ? null : v; }
    return v;
  }

  function buildForm(m, orig, onSave) {
    var read = {}, form = EPK.el("form", { novalidate: "", style: "display:grid;gap:10px;max-height:70vh;overflow-y:auto;padding:2px" });
    function row(label, req, ctl, hint) {
      var d = EPK.el("div", { style: "display:grid;gap:4px" }, [EPK.el("label", { style: "font-weight:600;font-size:13px" }, [label + (req ? " *" : "")]), ctl]);
      if (hint) d.appendChild(EPK.el("small", { text: hint, style: "color:var(--muted)" }));
      form.appendChild(d);
    }
    function text(id, type, req, label, hint) {
      var i = EPK.el("input", { type: type || "text", "data-f": id, autocomplete: "off", style: "width:100%" }); i.value = orig[id];
      read[id] = function () { return i.value; }; row(label, req, i, hint);
    }
    function group(id, kind, label, opts, withEmpty) {
      var box = EPK.el("div", { style: "display:flex;flex-wrap:wrap;gap:6px 14px" }), items = [];
      (withEmpty ? [""].concat(opts) : opts).forEach(function (o) {
        var i = EPK.el("input", { type: kind, name: "uf_" + id, value: o, "data-f": id });
        i.checked = kind === "radio" ? orig[id] === o : orig[id].indexOf(o) >= 0; items.push(i);
        box.appendChild(EPK.el("label", { style: "display:inline-flex;gap:6px;align-items:center;font-weight:400" }, [i, o === "" ? "(kosong)" : o]));
      });
      read[id] = function () {
        if (kind === "radio") { var on = items.filter(function (x) { return x.checked; })[0]; return on ? on.value : ""; }
        return items.filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
      };
      row(label, id === F.jk, box);
    }
    function pick(id, label, list) {
      var s = EPK.el("select", { "data-f": id, style: "width:100%" }, [EPK.el("option", { value: "", text: "(kosong)" })].concat(list.map(function (o) { return EPK.el("option", { value: o.id, text: o.nama }); })));
      s.value = orig[id]; read[id] = function () { return s.value; }; row(label, false, s);
    }
    text(F.baptis, "text", false, "Nama Baptis");
    text(F.nama, "text", true, "Nama Lengkap");
    text(F.pang, "text", false, "Nama Panggilan");
    text(F.wa, "text", true, "No Whatsapp Aktif");
    text(F.lain, "text", false, "No Lain");
    text(F.email, "text", false, "Email");
    text(F.tgl, "date", false, "Tanggal Lahir");
    group(F.jk, "radio", "Jenis Kelamin", m.jk, false);
    var ta = EPK.el("textarea", { "data-f": F.alamat, rows: "3", style: "width:100%" }); ta.value = orig[F.alamat];
    read[F.alamat] = function () { return ta.value; }; row("Alamat Tinggal", false, ta);
    pick(F.pd, "PD Komunitas", m.pd);
    pick(F.paroki, "Paroki", m.paroki);
    group(F.libat, "checkbox", "Keterlibatan di BPKPKK Bandung", m.libat, false);
    group(F.kual, "radio", "Kualifikasi", m.kualifikasi, true);
    group(F.alumni, "checkbox", "Alumni", m.alumni, false);
    var hp = EPK.el("input", { type: "checkbox", "data-f": F.hapus }); hp.checked = orig[F.hapus];
    read[F.hapus] = function () { return hp.checked; };
    row("Hapus?", false, EPK.el("label", { style: "display:inline-flex;gap:6px;align-items:center;font-weight:400" }, [hp, "Centang bila ini data dobel (hanya menandai, baris tidak dihapus)"]));
    var msg = EPK.el("p", { role: "alert", style: "min-height:1.4em;margin:0;color:var(--danger)" });
    var btn = EPK.el("button", { type: "button", class: "btn primary", "data-act": "simpan", text: "Simpan" });
    form.appendChild(msg); form.appendChild(EPK.el("div", { style: "display:flex;justify-content:flex-end" }, [btn]));
    function current() { var c = {}; IDS.forEach(function (id) { c[id] = read[id](); }); return c; }
    btn.addEventListener("click", function () { onSave(current(), msg, btn); });
    return form;
  }

  function applyLocal(id, changed, m) {
    var D = window.D, list = D && D.ua; if (!list) return;
    var i = -1; list.forEach(function (o, n) { if (o.id === id) i = n; });
    if (i < 0) return;
    if (changed[F.hapus] === true) list.splice(i, 1);
    else {
      if (F.nama in changed) list[i].nama = changed[F.nama] || list[i].nama;
      if (F.pang in changed) list[i].pang = changed[F.pang] || "";
      if (F.pd in changed) { var p = m.pd.filter(function (x) { return x.id === (changed[F.pd][0] || ""); })[0]; list[i].pd = p ? p.nama : ""; }
    }
    if (window.renderUmat) window.renderUmat();
  }
  function done() {
    var old = document.getElementById("uaEditOk"); if (old) old.remove();
    var p = EPK.el("p", { id: "uaEditOk", role: "status", class: "note", text: "Tersimpan." });
    var host = document.getElementById("tab-umat") || document.body; host.insertBefore(p, host.firstChild);
    setTimeout(function () { p.remove(); }, 4000);
  }

  function openEdit(id, opener) {
    if (opener) opener.disabled = true;
    Promise.all([getMeta(), api("list_records_for_table", { baseId: BASE, tableId: TBL, recordIds: [id], fieldIds: IDS, pageSize: 1 })]).then(function (r) {
      var m = r[0], rec = (r[1].records || [])[0];
      if (!rec) throw new Error("Data umat tidak ditemukan.");
      var orig = initial(rec.cellValuesByFieldId || rec.fields || {}, m), box;
      var form = buildForm(m, orig, function (cur, msg, btn) {
        if (busy) return;
        var p = problem(cur); if (p) { msg.textContent = p; return; }
        var changed = {};
        IDS.forEach(function (fid) { if (JSON.stringify(cur[fid]) !== JSON.stringify(orig[fid])) changed[fid] = toApi(fid, cur[fid]); });
        if (!Object.keys(changed).length) { msg.textContent = "Tidak ada perubahan."; return; }
        busy = true; btn.disabled = true; msg.textContent = "Menyimpan…";
        api("update_records_for_table", { baseId: BASE, tableId: TBL, records: [{ id: id, fields: changed }] }).then(function () {
          busy = false; box.close(); applyLocal(id, changed, m); done();
        }, function (e) { busy = false; btn.disabled = false; msg.textContent = e.message || "Gagal menyimpan."; });
      });
      box = EPK.modal("Edit data umat", form);
    }).catch(function (e) {
      EPK.modal("Edit data umat", EPK.el("p", { role: "alert", text: e.message || "Gagal memuat data." }));
    }).then(function () { if (opener) opener.disabled = false; });
  }

  function decorate() {
    Array.prototype.forEach.call(document.querySelectorAll("#uaBody .acts"), function (acts) {
      if (acts.querySelector("[data-ua-edit]")) return;
      var v = acts.querySelector("[data-ua]"); if (!v) return;
      acts.insertBefore(EPK.el("button", { type: "button", class: "act", "data-ua-edit": v.getAttribute("data-ua"), "aria-label": "Edit data umat" }, ["Edit"]), v.nextSibling);
    });
  }
  function init() {
    var body = document.getElementById("uaBody"); if (!body || body.getAttribute("data-ua-edit-on")) return;
    body.setAttribute("data-ua-edit-on", "1");
    new MutationObserver(decorate).observe(body, { childList: true });
    body.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-ua-edit]");
      if (b && !b.disabled) openEdit(b.getAttribute("data-ua-edit"), b);
    });
    decorate();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
`;
