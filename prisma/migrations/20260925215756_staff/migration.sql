-- CreateEnum
CREATE TYPE "STAFF_STATUS" AS ENUM ('GENERAL_MANAGER', 'ASSISTANT_MANAGER', 'SHIFT_MANAGER', 'CASHIER', 'SERVER', 'HOST', 'COOK', 'CHEF', 'KITCHEN_STAFF', 'BARISTA', 'DELIVERY_DRIVER', 'CLEANER');

-- CreateEnum
CREATE TYPE "EMPLOYMENT_TYPE" AS ENUM ('FULL_TIME', 'PART_TIME', 'TEMPORARY', 'SEASONAL', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "SALARY_TYPE" AS ENUM ('HOURLY', 'SALARY');

-- AlterEnum
ALTER TYPE "ACCOUNT_TYPE" ADD VALUE 'OUTLET_STAFF';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "companyBanner" TEXT,
ADD COLUMN     "companyLogo" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "staffId" TEXT;

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "designation" "STAFF_STATUS" NOT NULL,
    "employmentType" "EMPLOYMENT_TYPE" NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "profileImage" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "salaryType" "SALARY_TYPE" NOT NULL DEFAULT 'SALARY',
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitDate" TIMESTAMP(3),
    "qrData" TEXT,
    "status" "STATUS" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_badgeNumber_key" ON "Staff"("badgeNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
