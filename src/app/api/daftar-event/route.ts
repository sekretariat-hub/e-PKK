import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { effectiveAccess, AS_COOKIE } from "@/lib/viewas";
import { buatTokenDaftar, infoDaftar, kirimDaftar, rateOk, umatUntukEvent } from "@/lib/daftar-event";
import { HttpError } from "@/lib/policy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    // Membuat link: hanya pemegang menu Event (akun asli, bukan Lihat sebagai).
    if (b?.aksi === "link") {
      const email = (await auth())?.user?.email?.toLowerCase();
      if (!email) throw new HttpError(401, "Belum login.");
      const { real, acc } = await effectiveAccess(email, (await cookies()).get(AS_COOKIE)?.value);
      if (acc?.viewAs) throw new HttpError(403, "Mode Lihat sebagai hanya pratinjau. Klik Kembali ke akun saya, lalu buat link dari akun Anda sendiri.");
      if (!real || real.status !== "Disetujui" || !real.tabs.includes("Event")) throw new HttpError(403, "Tidak punya akses.");
      return NextResponse.json({ token: buatTokenDaftar(String(b.event || "")) });
    }
    // Selebihnya publik (dilindungi token bertanda tangan + pembatas per IP).
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "x";
    const token = String(b?.token || "");
    if (b?.aksi === "info") return NextResponse.json(await infoDaftar(token));
    if (!rateOk("u:" + ip, 60) && b?.aksi === "umat") throw new HttpError(429, "Terlalu banyak percobaan. Coba lagi nanti.");
    if (b?.aksi === "umat") return NextResponse.json(await umatUntukEvent(token));
    if (b?.aksi === "kirim") {
      if (!rateOk("k:" + ip, 20)) throw new HttpError(429, "Terlalu banyak percobaan. Coba lagi nanti.");
      const r = await kirimDaftar(token, {
        umat: b.umat ? String(b.umat) : undefined,
        baru: b.baru ? { nama: String(b.baru.nama || ""), wa: String(b.baru.wa || ""), pd: String(b.baru.pd || "") } : undefined,
        aktif: b.aktif === true,
        jabatan: Array.isArray(b.jabatan) ? b.jabatan.map(String) : [],
        seksiLain: String(b.seksiLain || ""),
        website: String(b.website || ""),
      });
      return NextResponse.json(r);
    }
    throw new HttpError(400, "Aksi tidak dikenal.");
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("api/daftar-event", e);
    return NextResponse.json({ code: "tool_error", message: e instanceof HttpError ? e.message : "Kesalahan di server." }, { status });
  }
}
