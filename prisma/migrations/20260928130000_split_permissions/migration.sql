-- Split the old combined permissions into separate actions, keeping what each role could do
INSERT INTO "Permission" ("id", "name", "slug", "status", "createdAt", "updatedAt")
SELECT 'perm_' || replace(v.slug, '.', '_'), v.slug, v.slug, 'ACTIVE', NOW(), NOW()
FROM (VALUES
  ('staff.create'), ('staff.edit'), ('staff.delete'),
  ('reports.sales'), ('reports.items'), ('reports.servers'),
  ('reports.shifts'), ('reports.attendance'), ('reports.stock')
) AS v(slug)
WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p."slug" = v.slug);

INSERT INTO "PermissionBatch" ("id", "roleId", "permissionId", "status", "createdAt", "updatedAt")
SELECT 'batch_' || b."roleId" || '_' || replace(m.target, '.', '_'), b."roleId", target."id", 'ACTIVE', NOW(), NOW()
FROM "PermissionBatch" b
JOIN "Permission" source ON source."id" = b."permissionId"
JOIN (VALUES
  ('staff.manage', 'staff.create'), ('staff.manage', 'staff.edit'), ('staff.manage', 'staff.delete'),
  ('reports.view', 'reports.sales'), ('reports.view', 'reports.items'), ('reports.view', 'reports.servers'),
  ('reports.view', 'reports.shifts'), ('reports.view', 'reports.attendance'), ('reports.view', 'reports.stock')
) AS m(source, target) ON m.source = source."slug"
JOIN "Permission" target ON target."slug" = m.target
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

DELETE FROM "PermissionBatch" b
USING "Permission" p
WHERE p."id" = b."permissionId"
  AND p."slug" IN ('companies.manage', 'outlets.manage', 'staff.manage', 'menus.manage', 'items.manage');
