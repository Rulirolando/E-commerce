import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "../lib/zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          username: profile.name,
          email: profile.email,
          imgProfile: profile.picture,
          emailVerified: new Date(),
        };
      },
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsedCredentials = await loginSchema.safeParseAsync(credentials);
        if (!parsedCredentials.success) return null;

        const { email, password } = parsedCredentials.data;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password) return null;
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.username || user.nama,
          image: user.imgProfile,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login", // Sesuaikan dengan route login anda
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image;
      }

      if (!token.name && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { username: true, nama: true, imgProfile: true },
        });
        if (dbUser) {
          token.name = dbUser.username || dbUser.nama;
          token.picture = dbUser.imgProfile;
        }
      }

      if (trigger === "update" && session) {
        token.name = session.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string; // Paksa name masuk ke session klien
        session.user.image = token.picture as string;
      }

      return session;
    },
    async signIn({ account }) {
      // Jika login via Google, pastikan emailVerified terisi otomatis di DB
      if (account?.provider === "google") {
        return true;
      }

      return true;
    },
  },
});
