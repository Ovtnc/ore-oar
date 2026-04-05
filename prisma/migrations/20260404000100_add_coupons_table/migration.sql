CREATE TABLE IF NOT EXISTS "coupons" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discountType" TEXT NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "minOrderTotal" INTEGER NOT NULL DEFAULT 0,
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "collectionRestriction" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
CREATE INDEX IF NOT EXISTS "coupons_isActive_validUntil_idx" ON "coupons"("isActive", "validUntil");
