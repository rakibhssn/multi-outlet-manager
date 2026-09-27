-- CreateTable
CREATE TABLE "StaffShiftBreak" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "startedById" TEXT,
    "endedById" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffShiftBreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffShiftBreak_shiftId_endAt_idx" ON "StaffShiftBreak"("shiftId", "endAt");

-- AddForeignKey
ALTER TABLE "StaffShiftBreak" ADD CONSTRAINT "StaffShiftBreak_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "StaffShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShiftBreak" ADD CONSTRAINT "StaffShiftBreak_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShiftBreak" ADD CONSTRAINT "StaffShiftBreak_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

