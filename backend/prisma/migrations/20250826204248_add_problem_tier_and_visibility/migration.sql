-- CreateEnum
CREATE TYPE "public"."ProblemTier" AS ENUM ('INTERN', 'JUNIOR', 'SENIOR');

-- CreateEnum
CREATE TYPE "public"."UserTier" AS ENUM ('INTERN', 'JUNIOR', 'SENIOR');

-- AlterTable
ALTER TABLE "public"."Problem" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tier" "public"."ProblemTier" NOT NULL DEFAULT 'INTERN';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "tier" "public"."UserTier" NOT NULL DEFAULT 'INTERN';

-- CreateIndex
CREATE INDEX "Problem_tier_idx" ON "public"."Problem"("tier");

-- CreateIndex
CREATE INDEX "Problem_isPublic_idx" ON "public"."Problem"("isPublic");
