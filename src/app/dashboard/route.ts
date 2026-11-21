import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { effectiveAccess, AS_COOKIE } from "@/lib/viewas";
import { renderDashboard } from "@/ui/render";
import { sekjenContact } from "@/lib/approval";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await auth();
  const email = s?.user?.email;
  const url = new URL(req.url);
  const kelola = url.searchParams.get("kelola") === "1";
  const proker = /^rec[A-Za-z0-9]{14}$/.test(url.searchParams.get("proker") || "") ? (url.searchParams.get("proker") as string) : "";
  if (!email) return NextResponse.redirect(new URL(kelola ? "/masuk?kelola=1" : proker ? "/masuk?proker=" + proker : "/masuk", req.url));
  const { acc } = await effectiveAccess(email, (await cookies()).get(AS_COOKIE)?.value);
  if (!acc || acc.status !== "Disetujui" || !acc.tabs.length) return NextResponse.redirect(new URL("/", req.url));
  if (!acc.viewAs && acc.tabs.length === 1 && acc.tabs[0] === "Absensi") return NextResponse.redirect(new URL("/absen", req.url));
  return new NextResponse(renderDashboard(acc, kelola, ['Superadmin', 'Admin'].includes(acc.level) ? await sekjenContact() : null, proker), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
