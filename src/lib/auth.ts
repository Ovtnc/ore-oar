import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { AuthUser } from "@/lib/types";

type UserDoc = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  exp: number;
};

export const SESSION_COOKIE_NAME = "oar-ore-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const DEV_AUTH_SECRET = "oar-ore-dev-auth-secret";
let authSecretWarningShown = false;

function getAuthSecret() {
  const envSecret = process.env.AUTH_SECRET?.trim();
  if (envSecret) return envSecret;

  if (process.env.NODE_ENV === "production") {
    const fallbackSecret = process.env.ADMIN_PASSWORD?.trim();
    if (fallbackSecret && fallbackSecret.length >= 8) {
      if (!authSecretWarningShown) {
        console.warn(
          "[auth] AUTH_SECRET missing in production. Using temporary ADMIN_PASSWORD fallback. Please set AUTH_SECRET.",
        );
        authSecretWarningShown = true;
      }
      return fallbackSecret;
    }
  }

  return DEV_AUTH_SECRET;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPayload(payloadSegment: string) {
  return createHmac("sha256", getAuthSecret()).update(payloadSegment).digest("base64url");
}

function signaturesMatch(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;

  const computedHash = scryptSync(password, salt, 64).toString("hex");
  const originalBuffer = Buffer.from(originalHash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");

  if (originalBuffer.length !== computedBuffer.length) return false;
  return timingSafeEqual(originalBuffer, computedBuffer);
}

export function createSessionToken(user: AuthUser) {
  const payload: SessionPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadSegment);
  return `${payloadSegment}.${signature}`;
}

export function readSessionToken(token?: string | null): AuthUser | null {
  if (!token) return null;

  const [payloadSegment, signature] = token.split(".");
  if (!payloadSegment || !signature) return null;

  const expectedSignature = signPayload(payloadSegment);
  if (!signaturesMatch(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment)) as Partial<SessionPayload>;
    if (!payload.sub || !payload.email || !payload.name || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;

    return {
      id: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

function normalizeUserDoc(doc: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}): UserDoc {
  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const doc = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  return doc ? normalizeUserDoc(doc) : null;
}

export async function createUser(input: { name: string; email: string; passwordHash: string }) {
  const doc = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash,
    },
  });

  return {
    id: doc.id,
    name: doc.name,
    email: doc.email,
  } satisfies AuthUser;
}
