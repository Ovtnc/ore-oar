import { NextResponse } from "next/server";
import {
  createSessionToken,
  findUserByEmail,
  getSessionCookieOptions,
  normalizeEmail,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<{
      email: string;
      password: string;
    }>;

    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ error: "E-posta ve şifre zorunludur." }, { status: 400 });
    }

    const userDoc = await findUserByEmail(email);
    if (!userDoc || !verifyPassword(password, userDoc.passwordHash)) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

    const user = {
      id: String(userDoc._id),
      name: userDoc.name,
      email: userDoc.email,
    };

    const token = createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (err) {
    console.error("[auth/login] POST failed:", err);
    return NextResponse.json({ error: "Giriş yapılamadı." }, { status: 500 });
  }
}

