-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- AlterTable
ALTER TABLE "Role" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Role" ALTER COLUMN "key" TYPE TEXT USING "key"::TEXT;

-- Backfill role keys, names and the system role
INSERT INTO "Role" ("id", "key", "name", "description", "status", "createdAt", "updatedAt")
SELECT 'role_' || lower(v.key), v.key, v.key, NULL, 'ACTIVE', NOW(), NOW()
FROM (VALUES ('SUPER_ADMIN'), ('ADMIN'), ('MANAGER'), ('USER')) AS v(key)
WHERE NOT EXISTS (SELECT 1 FROM "Role" r WHERE r."key" = v.key);

UPDATE "Role" SET "key" = 'CUSTOM_' || upper("id") WHERE "key" IS NULL;
UPDATE "Role" SET "isSystem" = true WHERE "key" = 'SUPER_ADMIN';
UPDATE "Role" SET "name" = 'Super Admin' WHERE "key" = 'SUPER_ADMIN' AND "name" = 'SUPER_ADMIN';
UPDATE "Role" SET "name" = 'Outlet Admin' WHERE "key" = 'ADMIN' AND "name" = 'ADMIN';
UPDATE "Role" SET "name" = 'Manager' WHERE "key" = 'MANAGER' AND "name" = 'MANAGER';
UPDATE "Role" SET "name" = 'Staff' WHERE "key" = 'USER' AND "name" = 'USER';
ALTER TABLE "Role" ALTER COLUMN "key" SET NOT NULL;

-- Backfill every user's role from the old enum column
UPDATE "User" u SET "roleId" = r."id"
FROM "Role" r
WHERE u."roleId" IS NULL AND r."key" = u."role"::TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ALTER COLUMN "roleId" SET NOT NULL;

-- DropEnum
DROP TYPE "USER_ROLE";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
