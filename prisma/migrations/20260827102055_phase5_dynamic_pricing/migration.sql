-- CreateEnum
CREATE TYPE "ModelTier" AS ENUM ('LIGHT', 'MID', 'HEAVY');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "Model" ADD COLUMN     "contextWindow" INTEGER,
ADD COLUMN     "tier" "ModelTier";

-- AlterTable
ALTER TABLE "PricingSnapshot" ADD COLUMN     "batchInputPricePer1k" DECIMAL(12,8),
ADD COLUMN     "batchOutputPricePer1k" DECIMAL(12,8),
ADD COLUMN     "cachedInputPricePer1k" DECIMAL(12,8),
ADD COLUMN     "pricingDimensions" JSONB,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "lastPricingSyncAt" TIMESTAMP(3),
ADD COLUMN     "pricingSourceUrl" TEXT;

-- CreateTable
CREATE TABLE "PricingSyncLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "modelsSynced" INTEGER NOT NULL DEFAULT 0,
    "pricesUpdated" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PricingSyncLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PricingSyncLog" ADD CONSTRAINT "PricingSyncLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
