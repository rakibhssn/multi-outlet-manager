-- CreateIndex
CREATE UNIQUE INDEX "Company_parentId_name_key" ON "Company"("parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_menuId_name_key" ON "MenuItem"("menuId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionBatch_roleId_permissionId_key" ON "PermissionBatch"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
