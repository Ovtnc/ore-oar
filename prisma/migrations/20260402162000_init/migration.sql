-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "material" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "images" TEXT[],
    "collection" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "tags" TEXT[],
    "coatingOptions" JSONB,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "items" JSONB NOT NULL,
    "customerNote" TEXT,
    "shipping" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "subtotal" INTEGER,
    "shippingFee" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentIban" TEXT,
    "paymentIbanId" TEXT,
    "paymentIbanLabel" TEXT,
    "paymentIbanAccountHolder" TEXT,
    "paymentChatStartedAt" TIMESTAMP(3),
    "paymentNotifiedAt" TIMESTAMP(3),
    "paymentVerifiedAt" TIMESTAMP(3),
    "paymentPaidAmount" INTEGER,
    "paymentReceiptUrl" TEXT,
    "paymentTransactionRef" TEXT,
    "paymentVerificationNote" TEXT,
    "paymentVerificationSource" TEXT,
    "paymentVerificationFailedAt" TIMESTAMP(3),
    "lastPaymentReminderAt" TIMESTAMP(3),
    "paymentReminderCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productVariant" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "replies" JSONB,
    "lastReplyAt" TIMESTAMP(3),
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "support_requests_orderId_idx" ON "support_requests"("orderId");

-- CreateIndex
CREATE INDEX "support_requests_status_createdAt_idx" ON "support_requests"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

