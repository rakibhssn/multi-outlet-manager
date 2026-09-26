-- CreateTable
CREATE TABLE "MenuItemOutlet" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemOutlet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemOutlet_menuItemId_branchId_key" ON "MenuItemOutlet"("menuItemId", "branchId");

-- AddForeignKey
ALTER TABLE "MenuItemOutlet" ADD CONSTRAINT "MenuItemOutlet_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOutlet" ADD CONSTRAINT "MenuItemOutlet_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MoveData
INSERT INTO "MenuItemOutlet" ("id", "menuItemId", "branchId", "price", "createdAt", "updatedAt")
SELECT
    'c' || substr(md5(mi."id" || mo."branchId" || clock_timestamp()::text), 1, 24),
    mi."id",
    mo."branchId",
    NULL,
    mo."createdAt",
    CURRENT_TIMESTAMP
FROM "MenuOutlet" mo
JOIN "MenuItem" mi ON mi."menuId" = mo."menuId"
ON CONFLICT ("menuItemId", "branchId") DO NOTHING;

-- DropForeignKey
ALTER TABLE "MenuOutlet" DROP CONSTRAINT "MenuOutlet_branchId_fkey";

-- DropForeignKey
ALTER TABLE "MenuOutlet" DROP CONSTRAINT "MenuOutlet_menuId_fkey";

-- DropTable
DROP TABLE "MenuOutlet";
