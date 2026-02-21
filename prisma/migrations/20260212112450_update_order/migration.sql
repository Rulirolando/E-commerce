/*
  Warnings:

  - You are about to drop the column `stok` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_produkId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "stok",
ADD COLUMN     "alamat" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "namaPenerima" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "telepon" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "produkId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Variation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
