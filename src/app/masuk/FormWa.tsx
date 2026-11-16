"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import s from "./masuk.module.css";

type Langkah = "nomor" | "password" | "otp" | "buat";
const PESAN: Record<string, string> = { salah: "Nomor atau password salah.", terkunci: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit, atau pakai Lupa password.", ditolak: "Akun ini dinonaktifkan. Hubungi sekretariat.", galat: "Terjadi kesalahan. Coba lagi." };

async function api(body: object) {
  const r = await fetch("/api/wa-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || "Terjadi kesalahan.");
  return j;
}

export default function FormWa({ dest }: { dest: string }) {
  const [langkah, setLangkah] = useState<Langkah>("nomor");
  const [wa, setWa] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState(""), [kode, setKode] = useState(""), [token, setToken] = useState("");
  const [info, setInfo] = useState(""), [err, setErr] = useState(""), [sibuk, setSibuk] = useState(false), [baru, setBaru] = useState(false);

  async function jalan(f: () => Promise<void>) {
    setErr(""); setSibuk(true);
    try { await f(); } catch (e: any) { setErr(e.message || "Terjadi kesalahan."); }
    setSibuk(false);
  }
  const kirimKode = async (untukBaru: boolean) => {
    await api({ action: "kirim", wa });
    setBaru(untukBaru); setKode(""); setLangkah("otp");
    setInfo(untukBaru ? "Nomor ini belum terdaftar. Kami mengirim kode 4 digit ke WhatsApp Anda untuk membuat akun baru." : "Kami mengirim kode 4 digit ke WhatsApp Anda.");
  };
  const masuk = async (passwordnya: string) => {
    const r: any = await signIn("credentials", { wa, password: passwordnya, redirect: false });
    if (r?.error || r?.ok === false) throw new Error(PESAN[r?.code || "salah"] || PESAN.salah);
    window.location.href = dest;
  };

  return (
    <div className={s.form}>
      {info && <p className={s.info}>{info}</p>}
      {err && <p className={s.err} role="alert">{err}</p>}

      {langkah === "nomor" && (
        <form onSubmit={(e) => { e.preventDefault(); jalan(async () => {
          const c = await api({ action: "cek", wa }); setWa(c.wa); setInfo("");
          if (c.status === "ada") setLangkah("password"); else await kirimKode(c.status === "baru");
        }); }}>
          <label className={s.lbl} htmlFor="wa">Nomor WhatsApp</label>
          <input id="wa" className={s.inp} inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={wa} onChange={(e) => setWa(e.target.value)} required />
          <button className={s.btn} disabled={sibuk}>{sibuk ? "Memeriksa…" : "Lanjut"}</button>
        </form>
      )}

      {langkah === "password" && (
        <form onSubmit={(e) => { e.preventDefault(); jalan(() => masuk(pw)); }}>
          <p className={s.sub}>Masuk sebagai <b>{wa}</b></p>
          <label className={s.lbl} htmlFor="pw">Password</label>
          <input id="pw" className={s.inp} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
          <button className={s.btn} disabled={sibuk}>{sibuk ? "Masuk…" : "Masuk"}</button>
          <button type="button" className={s.link} onClick={() => jalan(() => kirimKode(false))}>Lupa password? Kirim kode ke WhatsApp</button>
          <button type="button" className={s.link} onClick={() => { setLangkah("nomor"); setErr(""); setPw(""); }}>Ganti nomor</button>
        </form>
      )}

      {langkah === "otp" && (
        <form onSubmit={(e) => { e.preventDefault(); jalan(async () => { const v = await api({ action: "verif", wa, kode }); setToken(v.token); setInfo(""); setLangkah("buat"); }); }}>
          <label className={s.lbl} htmlFor="kode">Kode dari WhatsApp ke {wa}</label>
          <input id="kode" className={`${s.inp} ${s.kode}`} inputMode="numeric" autoComplete="one-time-code" maxLength={4} pattern="\d{4}" placeholder="0000" value={kode} onChange={(e) => setKode(e.target.value.replace(/\D/g, ""))} required autoFocus />
          <button className={s.btn} disabled={sibuk || kode.length !== 4}>{sibuk ? "Memeriksa…" : "Verifikasi"}</button>
          <button type="button" className={s.link} onClick={() => jalan(() => kirimKode(baru))}>Kirim ulang kode</button>
          <button type="button" className={s.link} onClick={() => { setLangkah("nomor"); setErr(""); setInfo(""); }}>Ganti nomor</button>
        </form>
      )}

      {langkah === "buat" && (
        <form onSubmit={(e) => { e.preventDefault(); jalan(async () => {
          if (pw !== pw2) throw new Error("Kedua password tidak sama.");
          await api({ action: "set", token, password: pw });
          await masuk(pw);
        }); }}>
          <p className={s.sub}>Kode benar. Buat password untuk masuk berikutnya (minimal 8 karakter).</p>
          <label className={s.lbl} htmlFor="pw">Password baru</label>
          <input id="pw" className={s.inp} type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
          <label className={s.lbl} htmlFor="pw2">Ulangi password</label>
          <input id="pw2" className={s.inp} type="password" autoComplete="new-password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          <button className={s.btn} disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan dan masuk"}</button>
        </form>
      )}
    </div>
  );
}
