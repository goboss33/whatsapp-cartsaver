/*
  Warnings:

  - A unique constraint covering the columns `[checkoutToken]` on the table `AbandonedCheckout` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AbandonedCheckout" ADD COLUMN "checkoutToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedCheckout_checkoutToken_key" ON "AbandonedCheckout"("checkoutToken");
