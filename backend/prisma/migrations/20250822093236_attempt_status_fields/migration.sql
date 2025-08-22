/*
  Warnings:

  - You are about to drop the column `result` on the `Attempt` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AttemptStatus" AS ENUM ('SUBMITTED', 'PASSED', 'FAILED', 'ERROR');

-- AlterTable
ALTER TABLE "public"."Attempt" DROP COLUMN "result",
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'typescript',
ADD COLUMN     "passedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "runtimeMs" INTEGER,
ADD COLUMN     "status" "public"."AttemptStatus" NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN     "totalCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Attempt_userId_problemId_status_idx" ON "public"."Attempt"("userId", "problemId", "status");

-- CreateIndex
CREATE INDEX "Attempt_problemId_status_idx" ON "public"."Attempt"("problemId", "status");
