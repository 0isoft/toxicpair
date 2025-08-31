-- CreateEnum
CREATE TYPE "public"."EditorMode" AS ENUM ('CODE', 'VIBECODE');

-- AlterTable
ALTER TABLE "public"."Attempt" ADD COLUMN     "deadlineAt" TIMESTAMP(3),
ADD COLUMN     "timedOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Problem" ADD COLUMN     "allowSwitcheroo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editorMode" "public"."EditorMode" NOT NULL DEFAULT 'CODE',
ADD COLUMN     "switcherooPolicy" JSONB,
ADD COLUMN     "timeLimitSeconds" INTEGER;

-- CreateTable
CREATE TABLE "public"."SessionTimerEvent" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "executeAt" TIMESTAMP(3) NOT NULL,
    "deltaSeconds" INTEGER NOT NULL,
    "message" TEXT,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTimerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionTimerEvent_sessionId_applied_executeAt_idx" ON "public"."SessionTimerEvent"("sessionId", "applied", "executeAt");

-- AddForeignKey
ALTER TABLE "public"."SessionTimerEvent" ADD CONSTRAINT "SessionTimerEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
