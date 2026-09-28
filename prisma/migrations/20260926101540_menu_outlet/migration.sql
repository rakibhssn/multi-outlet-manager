-- CreateTable
CREATE TABLE "MenuOutlet" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuOutlet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuOutlet_menuId_branchId_key" ON "MenuOutlet"("menuId", "branchId");

-- AddForeignKey
ALTER TABLE "MenuOutlet" ADD CONSTRAINT "MenuOutlet_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuOutlet" ADD CONSTRAINT "MenuOutlet_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
