import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { notifLuarKota } from "@/lib/luar-kota";
import { HttpError } from "@/lib/policy";

export const dynamic = "force-dynamic";

const sha = (s: string) => crypto.createHash("sha256").update(s).digest();

/** Dipanggil Airtable automation saat permohonan pewarta baru masuk. Dijaga secret bersama (env HOOK_SECRET). */
export async function POST(req: Request) {
  const secret = process.env.HOOK_SECRET || "";
  const kirim = req.headers.get("x-webhook-secret") || "";
  if (!secret || !crypto.timingSafeEqual(sha(secret), sha(kirim))) return NextResponse.json({ message: "Tidak diizinkan." }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await notifLuarKota(String(body?.eventId || "")));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return NextResponse.json({ message: status === 500 ? "Terjadi kesalahan." : (e as Error).message }, { status });
  }
}
