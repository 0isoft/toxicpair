-- CreateEnum
CREATE TYPE "public"."ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- DropForeignKey
ALTER TABLE "public"."ChatMessage" DROP CONSTRAINT "ChatMessage_userId_fkey";

-- AlterTable
ALTER TABLE "public"."ChatMessage" ADD COLUMN     "code" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "role" "public"."ChatRole" NOT NULL DEFAULT 'USER',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_sentAt_idx" ON "public"."ChatMessage"("sessionId", "sentAt");

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
