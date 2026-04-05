CREATE TABLE IF NOT EXISTS "reviews" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "images" TEXT[] NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reviews_productId_status_createdAt_idx" ON "reviews"("productId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "reviews_status_createdAt_idx" ON "reviews"("status", "createdAt" DESC);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
