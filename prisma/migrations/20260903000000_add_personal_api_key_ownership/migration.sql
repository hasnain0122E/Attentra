-- AlterTable: Add personal API key ownership support
-- Phase 12.13.1 — Personal API Key Foundation
--
-- XOR ownership invariant (enforced at application level):
--   Personal key: userId IS NOT NULL AND businessId IS NULL
--   Business key: businessId IS NOT NULL AND userId IS NULL

-- Add userId column for personal key ownership
ALTER TABLE "ApiKey" ADD COLUMN "userId" TEXT;

-- Make businessId nullable (was previously required)
ALTER TABLE "ApiKey" ALTER COLUMN "businessId" DROP NOT NULL;

-- Add foreign key for personal key ownership
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
