import "server-only";

import { PrismaClient } from "@prisma/client";
import { prepareDatabaseUrl } from "@/lib/database-url";

const databaseUrl = prepareDatabaseUrl();
if (!databaseUrl.url && process.env.NODE_ENV !== "production") {
  console.warn(
    "[prisma] DATABASE_URL could not be resolved. Set DATABASE_URL or POSTGRES_* variables in .env.",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
