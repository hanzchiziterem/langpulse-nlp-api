/*
  Warnings:

  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "forgotPasswordCode" TEXT,
ADD COLUMN     "forgotPasswordCodeValidation" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationCode" TEXT,
ADD COLUMN     "verificationCodeValidation" INTEGER,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;
