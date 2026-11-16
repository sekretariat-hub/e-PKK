import { signIn } from "@/auth";
import s from "./masuk.module.css";

export const dynamic = "force-dynamic";

export default async function Masuk({ searchParams }: { searchParams: Promise<{ kelola?: string; next?: string }> }) {
  const sp = await searchParams;
  const dest = sp?.kelola === "1" ? "/dashboard?kelola=1" : /^\/absen(\/[A-Za-z0-9._-]+)?$/.test(sp?.next || "") ? (sp.next as string) : "/";
  return (
    <main className={s.bg}>
      <section className={s.card}>
        <img className={s.logo} src="/logo.png" alt="Logo BPK Keuskupan Bandung" />
        <h1 className={s.title}>BPK PKK Bandung</h1>
        <p className={s.sub}>Dashboard pengurus, pewarta, PD, dan kegiatan. Masuk dengan akun Google yang sudah didaftarkan sekretariat.</p>
        <div className={s.accent} aria-hidden="true" />
        <form action={async () => { "use server"; await signIn("google", { redirectTo: dest }); }}>
          <button type="submit" className={s.btn}>Masuk dengan Google</button>
        </form>
        <p className={s.note}>Belum terdaftar? Hubungi sekretariat BPK PKK Bandung.</p>
      </section>
    </main>
  );
}
