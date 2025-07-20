-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO', 'DEBUG');

-- AlterTable
ALTER TABLE "SecurityLog" ADD COLUMN     "severity" "SeverityLevel" NOT NULL DEFAULT 'MEDIUM';
