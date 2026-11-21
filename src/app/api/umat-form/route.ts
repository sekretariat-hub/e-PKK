import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { effectiveAccess, AS_COOKIE } from "@/lib/viewas";
import { HttpError } from "@/lib/policy";
import { getUmatFormMeta } from "@/lib/umat-form";

export const dynamic = "force-dynamic";

/** Pilihan untuk form Edit umat. Khusus Superadmin (bukan mode "Lihat sebagai"). */
export async function GET() {
  const s = await auth();
  const email = s?.user?.email;
  if (!email) return NextResponse.json({ message: "Belum login." }, { status: 401 });
  try {
    const { acc } = await effectiveAccess(email, (await cookies()).get(AS_COOKIE)?.value);
    if (!acc || acc.status !== "Disetujui" || acc.level !== "Superadmin" || acc.viewAs || !acc.tabs.includes("Umat")) throw new HttpError(403, "Khusus Superadmin.");
    return NextResponse.json(await getUmatFormMeta());
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("api/umat-form", e);
    return NextResponse.json({ message: e instanceof HttpError ? e.message : "Kesalahan di server." }, { status });
  }
}
