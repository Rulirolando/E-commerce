import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "../lib/zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { timingSafeEqual } from "crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        const emailPrefix = profile.email
          ? profile.email.split("@")[0]
          : "google";

        return {
          id: profile.sub,
          username: emailPrefix,
          nama: profile.name || emailPrefix,
          email: profile.email,
          imgProfile: profile.picture,
          emailVerified: new Date(),
        };
      },
    }),
    Credentials({
      credentials: { email: {}, password: {}, otp: {} },
      async authorize(credentials) {
        const parsed = await loginSchema.safeParseAsync(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const password = parsed.data.password;
        const otp =
          typeof credentials?.otp === "string" ? credentials.otp.trim() : "";

        if (!/^\d{6}$/.test(otp)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password || !user.emailVerified) return null;

        // Akun sedang terkunci
        if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
          return null;
        }

        // 1. Cek password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return null;

        // 2. Cek OTP (satu-satunya tempat OTP login diverifikasi)
        const rec = await prisma.otp.findUnique({ where: { email } });

        if (
          !rec ||
          rec.type !== "LOGIN" ||
          rec.blocked ||
          rec.attempts >= 3 ||
          rec.expiresAt <= new Date()
        ) {
          return null;
        }

        const a = Buffer.from(rec.code);
        const b = Buffer.from(otp);
        const otpMatch = a.length === b.length && timingSafeEqual(a, b);

        if (!otpMatch) {
          const attempts = rec.attempts + 1;
          await prisma.otp.update({
            where: { id: rec.id },
            data: { attempts, blocked: attempts >= 3 },
          });
          return null;
        }

        // 3. Semua benar: hapus OTP & reset counter login
        await prisma.otp.delete({ where: { id: rec.id } });
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, loginLockedUntil: null },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.username || user.nama,
          image: user.imgProfile,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            username: true,
            nama: true,
            imgProfile: true,
            role: true,
            email: true,
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.username || dbUser.nama || "";
          token.picture = dbUser.imgProfile || "";
          token.role = dbUser.role;
        }
      }

      if (trigger === "update" && session) {
        if (typeof session.name === "string") {
          token.name = session.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.user.role = token.role as "USER" | "ADMIN" | "SUPER_ADMIN";
      }

      return session;
    },
    async signIn() {
      return true;
    },
  },
});
