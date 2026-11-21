import { signIn } from "@/auth";
import s from "./masuk.module.css";
import FormWa from "./FormWa";

export const dynamic = "force-dynamic";

export default async function Masuk({ searchParams }: { searchParams: Promise<{ kelola?: string; next?: string; proker?: string }> }) {
  const sp = await searchParams;
  const dest = sp?.kelola === "1" ? "/dashboard?kelola=1" : /^rec[A-Za-z0-9]{14}$/.test(sp?.proker || "") ? "/dashboard?proker=" + sp.proker : /^\/absen(\/[A-Za-z0-9._-]+)?$/.test(sp?.next || "") ? (sp.next as string) : "/";
  return (
    <main className={s.bg}>
      <section className={s.card}>
        <img className={s.logo} src="/logo.png" alt="Logo BPK Keuskupan Bandung" />
        <h1 className={s.title}>BPK PKK Bandung</h1>
        <p className={s.sub}>Dashboard pengurus, pewarta, PD, dan kegiatan. Masuk dengan nomor WhatsApp. Belum punya akun? Cukup masukkan nomor Anda, lalu ikuti kode yang dikirim ke WhatsApp.</p>
        <div className={s.accent} aria-hidden="true" />
        <FormWa dest={dest} />
        <div className={s.pemisah}><span>atau</span></div>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: dest }); }}>
          <button type="submit" className={s.btnGhost}>Masuk dengan Google</button>
        </form>
        <p className={s.note}>Akun baru akan menunggu persetujuan sekretariat BPK PKK Bandung.</p>
      </section>
    </main>
  );
}
