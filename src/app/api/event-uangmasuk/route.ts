import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { effectiveAccess, AS_COOKIE } from "@/lib/viewas";
import { HttpError } from "@/lib/policy";
import { pastikanKeuangan } from "@/lib/keuangan-akses";
import { uangMasukEvent } from "@/lib/uang-masuk";

export const dynamic = "force-dynamic";
const REC = /^rec[A-Za-z0-9]{14}$/;

/** Total uang masuk pendaftar sebuah event, dari Mutasi (base Bendahara). Hanya untuk yang berhak Keuangan. */
export async function POST(req: Request) {
  try {
    const email = (await auth())?.user?.email?.toLowerCase();
    if (!email) throw new HttpError(401, "Belum login.");
    const { real, acc } = await effectiveAccess(email, (await cookies()).get(AS_COOKIE)?.value);
    const a = acc || real;
    if (!real || real.status !== "Disetujui" || !a?.tabs.includes("Event")) throw new HttpError(403, "Tidak punya akses menu Event.");
    await pastikanKeuangan(a);
    const b = await req.json();
    const id = String(b?.event || "");
    if (!REC.test(id)) throw new HttpError(400, "Event tidak valid.");
    return NextResponse.json(await uangMasukEvent(id));
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("api/event-uangmasuk", e);
    return NextResponse.json({ code: "tool_error", message: e instanceof HttpError ? e.message : "Kesalahan di server." }, { status });
  }
}
