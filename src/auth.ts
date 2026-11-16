import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { registerLogin } from "@/lib/access";
import { loginPassword } from "@/lib/wa-login";
import { HttpError } from "@/lib/policy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    // Login utama: nomor WhatsApp + password (password dibuat lewat OTP WA; lihat /api/wa-login).
    Credentials({
      credentials: { wa: {}, password: {} },
      async authorize(c) {
        try {
          const u = await loginPassword(String(c?.wa || ""), String(c?.password || ""));
          return { id: u.email, email: u.email, name: u.name };
        } catch (e) {
          const err = new CredentialsSignin();
          err.code = e instanceof HttpError ? (e.status === 429 ? "terkunci" : e.status === 403 ? "ditolak" : "salah") : "galat";
          if (!(e instanceof HttpError)) console.error("login wa gagal", e);
          throw err;
        }
      },
    }),
  ],
  trustHost: true,
  redirectProxyUrl: process.env.AUTH_REDIRECT_PROXY_URL,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/masuk" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "credentials") return true;
      const email = profile?.email;
      if (!email || profile?.email_verified === false) return false;
      try { await registerLogin(email, (profile?.name as string) || ""); } catch (e) { console.error("registerLogin gagal", e); }
      return true;
    },
  },
});
