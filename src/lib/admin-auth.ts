import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { normalizeEmail, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { AuthUser } from "@/lib/types";

function getConfiguredAdminEmail() {
  const value = process.env.ADMIN_ALLOWED_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim() || "";
  return normalizeEmail(value);
}

export function isAdminUser(user: AuthUser | null | undefined) {
  if (!user) return false;
  const adminEmail = getConfiguredAdminEmail();
  if (!adminEmail) return false;
  return normalizeEmail(user.email) === adminEmail;
}

export async function getSessionUserFromCookies() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return readSessionToken(token);
}

export async function requireAdminPageAccess() {
  const user = await getSessionUserFromCookies();
  if (!user) {
    redirect("/login?next=/admin/panel");
  }
  if (!isAdminUser(user)) {
    redirect("/");
  }
  return user;
}

export async function requireAdminApiAccess() {
  const user = await getSessionUserFromCookies();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Admin erişimi için giriş yapmalısınız." }, { status: 401 }),
    };
  }
  if (!isAdminUser(user)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Bu işlem için admin yetkisi gerekiyor." }, { status: 403 }),
    };
  }
  return {
    ok: true as const,
    user,
  };
}

