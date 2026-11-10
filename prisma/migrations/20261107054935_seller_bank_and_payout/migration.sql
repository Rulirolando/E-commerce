/*
  Warnings:

  - You are about to drop the column `accountNumber` on the `BankAccount` table. All the data in the column will be lost.
  - Added the required column `accountNumberEnc` to the `BankAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountNumberLast4` to the `BankAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "accountNumber",
ADD COLUMN     "accountNumberEnc" TEXT NOT NULL,
ADD COLUMN     "accountNumberLast4" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "accountName" TEXT,
ADD COLUMN     "accountNumberEnc" TEXT,
ADD COLUMN     "bankCode" TEXT,
ADD COLUMN     "bankName" TEXT,
ALTER COLUMN "status" SET DEFAULT 'MENUNGGU_REKENING';
