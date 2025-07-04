/*
  Warnings:

  - You are about to drop the `BlacklistedToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshToken" TEXT;

-- DropTable
DROP TABLE "BlacklistedToken";
