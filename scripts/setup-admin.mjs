import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || process.env.ADMIN_ALLOWED_EMAIL);
  const adminName = String(process.env.ADMIN_NAME || "Admin").trim();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL eksik. .env dosyasini kontrol et.");
  }
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL eksik. .env dosyasini kontrol et.");
  }
  if (!adminPassword || adminPassword.length < 6) {
    throw new Error("ADMIN_PASSWORD en az 6 karakter olmali.");
  }

  const prisma = new PrismaClient();
  const passwordHash = hashPassword(adminPassword);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName || "Admin",
      passwordHash,
    },
    create: {
      name: adminName || "Admin",
      email: adminEmail,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  await prisma.$disconnect();
  console.log(`Admin hazir: ${user.email} (${user.name})`);
}

main().catch((error) => {
  console.error("Admin setup hatasi:", error instanceof Error ? error.message : error);
  process.exit(1);
});
