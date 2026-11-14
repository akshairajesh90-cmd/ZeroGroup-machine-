-- AlterTable
ALTER TABLE "daily_dispatches" ADD COLUMN IF NOT EXISTS "locationPriority" INTEGER DEFAULT 1;

-- CreateTable
CREATE TABLE IF NOT EXISTS "dispatch_location_candidates" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedById" TEXT,
    "evidenceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_location_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dispatch_location_candidates_dispatchId_idx" ON "dispatch_location_candidates"("dispatchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dispatch_location_candidates_capturedAt_idx" ON "dispatch_location_candidates"("capturedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dispatch_location_candidates_weight_idx" ON "dispatch_location_candidates"("weight");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_location_candidates_dispatchId_fkey'
    ) THEN
        ALTER TABLE "dispatch_location_candidates" 
        ADD CONSTRAINT "dispatch_location_candidates_dispatchId_fkey" 
        FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
