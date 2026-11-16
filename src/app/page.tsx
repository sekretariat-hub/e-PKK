import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getAccess } from "@/lib/access";
import gaya from "./masuk/masuk.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await auth();
  const email = s?.user?.email;
  if (!email) redirect("/masuk");
  const acc = await getAccess(email);
  if (acc && acc.status === "Disetujui" && acc.tabs.length) redirect("/dashboard");
  const pesan = !acc || acc.status === "Menunggu"
    ? "Permintaan akses Anda sudah tercatat dan menunggu persetujuan sekretariat BPKPKK Bandung."
    : acc.status === "Ditolak" ? "Akses untuk akun ini tidak disetujui." : "Akun Anda disetujui, tetapi belum diberi tab apa pun. Hubungi sekretariat.";
  return (
    <main className={gaya.bg}>
      <section className={gaya.card}>
        <img className={gaya.logo} src="/logo.png" alt="Logo BPK Keuskupan Bandung" />
        <h1 className={gaya.title}>BPK PKK Bandung</h1>
        <p className={gaya.sub}>Masuk sebagai <strong>{email}</strong>.</p>
        <div className={gaya.accent} aria-hidden="true" />
        <p className={gaya.sub}>{pesan}</p>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/masuk" }); }}>
          <button type="submit" className={gaya.btnGhost}>Keluar</button>
        </form>
      </section>
    </main>
  );
}
