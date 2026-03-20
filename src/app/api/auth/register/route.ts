import { NextResponse } from "next/server";
import {
  createSessionToken,
  createUser,
  findUserByEmail,
  getSessionCookieOptions,
  hashPassword,
  normalizeEmail,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

function validateInput(name: string, email: string, password: string) {
  if (name.trim().length < 2) return "Ad en az 2 karakter olmalı.";
  if (!email.includes("@")) return "Geçerli bir e-posta girin.";
  if (password.length < 6) return "Şifre en az 6 karakter olmalı.";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<{
      name: string;
      email: string;
      password: string;
    }>;

    const name = String(body.name ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    const validationError = validateInput(name, email, password);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const exists = await findUserByEmail(email);
    if (exists) {
      return NextResponse.json({ error: "Bu e-posta ile kayıtlı bir hesap var." }, { status: 409 });
    }

    const user = await createUser({
      name,
      email,
      passwordHash: hashPassword(password),
    });

    const token = createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (err) {
    console.error("[auth/register] POST failed:", err);
    const message = err instanceof Error ? err.message : "Kayıt oluşturulamadı.";
    if (message.includes("E11000")) {
      return NextResponse.json({ error: "Bu e-posta ile kayıtlı bir hesap var." }, { status: 409 });
    }
    return NextResponse.json({ error: "Kayıt oluşturulamadı." }, { status: 500 });
  }
}

