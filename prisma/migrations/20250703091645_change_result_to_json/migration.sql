/*
  Warnings:

  - Changed the type of `result` on the `Analysis` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Analysis" DROP COLUMN "result",
ADD COLUMN     "result" JSONB NOT NULL;
