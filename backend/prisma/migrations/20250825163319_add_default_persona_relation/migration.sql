-- AlterTable
ALTER TABLE "public"."Problem" ADD COLUMN     "defaultPersonaId" TEXT;

-- AlterTable
ALTER TABLE "public"."Session" ADD COLUMN     "personaConfig" JSONB,
ADD COLUMN     "personaId" TEXT,
ADD COLUMN     "personaModel" TEXT,
ADD COLUMN     "personaSystemPrompt" TEXT,
ADD COLUMN     "personaTemperature" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."Persona" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "avatarEmoji" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "topP" DOUBLE PRECISION,
    "maxOutputTokens" INTEGER,
    "config" JSONB,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProblemPersona" (
    "problemId" INTEGER NOT NULL,
    "personaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProblemPersona_pkey" PRIMARY KEY ("problemId","personaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_key_key" ON "public"."Persona"("key");

-- CreateIndex
CREATE INDEX "ProblemPersona_problemId_sortOrder_idx" ON "public"."ProblemPersona"("problemId", "sortOrder");

-- CreateIndex
CREATE INDEX "Problem_defaultPersonaId_idx" ON "public"."Problem"("defaultPersonaId");

-- AddForeignKey
ALTER TABLE "public"."Problem" ADD CONSTRAINT "Problem_defaultPersonaId_fkey" FOREIGN KEY ("defaultPersonaId") REFERENCES "public"."Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemPersona" ADD CONSTRAINT "ProblemPersona_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "public"."Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProblemPersona" ADD CONSTRAINT "ProblemPersona_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "public"."Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "public"."Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
