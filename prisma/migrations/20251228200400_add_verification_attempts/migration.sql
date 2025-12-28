-- CreateTable
CREATE TABLE "VerificationAttempt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "identifier" TEXT NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationAttempt_identifier_createdAt_idx" ON "VerificationAttempt"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationAttempt_ipAddress_createdAt_idx" ON "VerificationAttempt"("ipAddress", "createdAt");
