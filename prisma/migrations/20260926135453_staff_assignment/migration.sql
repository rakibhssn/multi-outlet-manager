-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BackfillCurrentPostings
INSERT INTO "StaffAssignment" ("id", "staffId", "branchId", "startDate", "endDate", "note", "createdAt", "updatedAt")
SELECT
    'c' || substr(md5(s."id" || s."branchId" || clock_timestamp()::text), 1, 24),
    s."id",
    s."branchId",
    s."hireDate",
    NULL,
    'Initial posting',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Staff" s;
