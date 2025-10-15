-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 60
);

-- CreateTable
CREATE TABLE "TwilioConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "accountSid" TEXT NOT NULL,
    "authToken" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AbandonedCheckout" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "checkoutId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "abandonedCheckoutUrl" TEXT,
    "cartTotal" REAL NOT NULL,
    "lineItems" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'abandoned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "TwilioConfig_shop_key" ON "TwilioConfig"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedCheckout_checkoutId_key" ON "AbandonedCheckout"("checkoutId");
