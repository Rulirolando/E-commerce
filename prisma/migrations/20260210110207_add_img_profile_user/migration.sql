-- DropForeignKey
ALTER TABLE "Img" DROP CONSTRAINT "Img_variationId_fkey";

-- DropForeignKey
ALTER TABLE "Size" DROP CONSTRAINT "Size_variationId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "imgProfile" TEXT;

-- AddForeignKey
ALTER TABLE "Size" ADD CONSTRAINT "Size_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Img" ADD CONSTRAINT "Img_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
