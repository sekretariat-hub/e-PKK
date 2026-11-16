import { NextResponse } from "next/server";
import { cekNomor, kirimOtp, setPassword, verifOtp } from "@/lib/wa-login";
import { HttpError } from "@/lib/policy";

export const dynamic = "force-dynamic";

// Pembatas kasar per IP (per instance). Pembatasan utama ada di lib/wa-login (per nomor, tersimpan di Airtable).
const hits = new Map<string, number[]>();
function terlalu(ip: string) {
  const t = Date.now(), a = (hits.get(ip) || []).filter((x) => t - x < 60_000);
  a.push(t); hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return a.length > 20;
}

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "x";
    if (terlalu(ip)) throw new HttpError(429, "Terlalu banyak permintaan. Coba lagi sebentar.");
    const b = await req.json();
    const a = String(b?.action || "");
    if (a === "cek") return NextResponse.json(await cekNomor(String(b?.wa || "")));
    if (a === "kirim") { await kirimOtp(String(b?.wa || "")); return NextResponse.json({ ok: true }); }
    if (a === "verif") return NextResponse.json(await verifOtp(String(b?.wa || ""), String(b?.kode || "")));
    if (a === "set") { await setPassword(String(b?.token || ""), String(b?.password || "")); return NextResponse.json({ ok: true }); }
    throw new HttpError(400, "Perintah tidak dikenal.");
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("api/wa-login", e);
    return NextResponse.json({ message: e instanceof HttpError ? e.message : "Kesalahan di server." }, { status });
  }
}
