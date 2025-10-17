/*
  Warnings:

  - You are about to drop the column `abandonedCheckoutUrl` on the `AbandonedCheckout` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AbandonedCheckout" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "checkoutId" TEXT NOT NULL,
    "checkoutToken" TEXT,
    "shop" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "recoveryUrl" TEXT,
    "cartTotal" REAL NOT NULL,
    "lineItems" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'abandoned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AbandonedCheckout" ("cartTotal", "checkoutId", "checkoutToken", "createdAt", "customerName", "customerPhone", "id", "lineItems", "shop", "status", "updatedAt") SELECT "cartTotal", "checkoutId", "checkoutToken", "createdAt", "customerName", "customerPhone", "id", "lineItems", "shop", "status", "updatedAt" FROM "AbandonedCheckout";
DROP TABLE "AbandonedCheckout";
ALTER TABLE "new_AbandonedCheckout" RENAME TO "AbandonedCheckout";
CREATE UNIQUE INDEX "AbandonedCheckout_checkoutId_key" ON "AbandonedCheckout"("checkoutId");
CREATE UNIQUE INDEX "AbandonedCheckout_checkoutToken_key" ON "AbandonedCheckout"("checkoutToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
