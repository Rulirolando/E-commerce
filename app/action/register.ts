"use server";

import prisma from "@/lib/prisma";
import { registerSchema } from "../../lib/zod";
import { ZodError } from "zod";
import bcrypt from "bcryptjs";
import { signIn } from "../auth";

// 1. Definisikan tipe data untuk State
export interface RegisterState {
  error?: string;
  success?: boolean;
}

// 2. Gunakan tipe data tersebut di fungsi
export async function registerUser(
  prevState: RegisterState | null,
  formData: FormData,
): Promise<RegisterState | undefined> {
  try {
    const data = Object.fromEntries(formData.entries());
    const validated = registerSchema.parse(data);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { error: "Email sudah digunakan" };
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);
    await prisma.user.create({
      data: {
        username: validated.username,
        email: validated.email,
        password: hashedPassword,
      },
    });

    // Auto Login
    await signIn("credentials", {
      email: validated.email,
      password: validated.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      // Mengambil pesan error pertama dari Zod
      return { error: error.issues[0].message };
    }

    // Penting untuk Auth.js agar redirect tetap jalan
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    return { error: "Terjadi kesalahan saat mendaftar" };
  }
}

export async function googleSignIn() {
  await signIn("google", { redirectTo: "/" });
}
