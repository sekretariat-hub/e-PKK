import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { notifLuarKota } from "@/lib/luar-kota";
import { HttpError } from "@/lib/policy";

export const dynamic = "force-dynamic";

const h = (s: string) => crypto.createHash("sha256").update(s).digest();
function secretOk(got: string): boolean {
  const want = process.env.HOOK_SECRET || "";
  if (!want || !got) return false;
  return crypto.timingSafeEqual(h(got), h(want));
}

export async function POST(req: Request) {
  if (!secretOk(req.headers.get("x-webhook-secret") || "")) return NextResponse.json({ message: "Tidak diizinkan." }, { status: 401 });
  try {
    const b = await req.json().catch(() => ({}));
    return NextResponse.json(await notifLuarKota(String(b?.eventId || "")));
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("hook/luar-kota", e?.message);
    return NextResponse.json({ message: e instanceof HttpError ? e.message : "Kesalahan di server." }, { status });
  }
}
