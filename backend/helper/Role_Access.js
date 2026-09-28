const prisma = require("../config/prisma");
const {
  ACCOUNT_DEFAULT_ROLE,
  ALL_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  SUPER_ADMIN_KEY,
  SYSTEM_ROLES,
  effectivePermissions,
} = require("./Permissions");

const activeBatches = {
  where: { status: "ACTIVE", permission: { status: "ACTIVE" } },
  select: { permission: { select: { slug: true } } },
};

const roleAccessSelect = { id: true, key: true, name: true, status: true, permissionBatches: activeBatches };

const invalidRole = (message) => Object.assign(new Error(message), { status: 422 });

async function syncPermissions() {
  const existing = await prisma.permission.findMany({ select: { slug: true } });
  const known = new Set(existing.map((permission) => permission.slug));
  for (const permission of ALL_PERMISSIONS) {
    const data = { name: `${permission.group} · ${permission.label}`, description: permission.kind, status: "ACTIVE" };
    await prisma.permission.upsert({
      where: { slug: permission.key },
      create: { slug: permission.key, ...data },
      update: data,
    });
  }
  await prisma.permission.updateMany({
    where: { slug: { notIn: ALL_PERMISSION_KEYS } },
    data: { status: "INACTIVE" },
  });
  return known.size ? ALL_PERMISSIONS.filter((permission) => !known.has(permission.key)) : [];
}

async function grantPermissions(roleIds, keys) {
  if (!roleIds.length || !keys.length) return;
  const permissions = await prisma.permission.findMany({ where: { slug: { in: keys } }, select: { id: true } });
  await prisma.permissionBatch.createMany({
    data: roleIds.flatMap((roleId) => permissions.map((permission) => ({ roleId, permissionId: permission.id }))),
    skipDuplicates: true,
  });
}

async function grantNewDefaults(role, added) {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role.key] ?? [];
  await grantPermissions([role.id], added.map((permission) => permission.key).filter((key) => defaults.includes(key)));
}

async function grantNewToHolders(added) {
  const byParent = new Map();
  for (const permission of added.filter((item) => item.parent)) {
    byParent.set(permission.parent, [...(byParent.get(permission.parent) ?? []), permission.key]);
  }
  for (const [parent, keys] of byParent) {
    const roles = await prisma.role.findMany({
      where: {
        isSystem: false,
        key: { notIn: Object.keys(DEFAULT_ROLE_PERMISSIONS) },
        permissionBatches: { some: { permission: { slug: parent } } },
      },
      select: { id: true },
    });
    await grantPermissions(roles.map((role) => role.id), keys);
  }
}

async function seedDefaults(role) {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role.key];
  if (!defaults?.length || (await prisma.permissionBatch.count({ where: { roleId: role.id } }))) return;
  const permissions = await prisma.permission.findMany({ where: { slug: { in: defaults } }, select: { id: true } });
  await prisma.permissionBatch.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    skipDuplicates: true,
  });
}

async function syncRoles() {
  const added = await syncPermissions();
  for (const { key, name, description, isSystem = false } of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { key },
      create: { key, name, description, isSystem },
      update: { isSystem, companyId: null },
    });
    if (!isSystem) {
      await seedDefaults(role);
      await grantNewDefaults(role, added);
    }
  }
  await grantNewToHolders(added);
}

function accessOf(role) {
  const active = role?.status === "ACTIVE";
  const keys = active ? role.permissionBatches.map((batch) => batch.permission.slug) : [];
  return {
    roleId: role?.id ?? null,
    roleKey: role?.key ?? null,
    roleName: role?.name ?? null,
    permissions: new Set(role?.key === SUPER_ADMIN_KEY ? ALL_PERMISSION_KEYS : effectivePermissions(role?.key, keys)),
  };
}

async function roleIdFor(key) {
  const role = await prisma.role.findUnique({ where: { key }, select: { id: true } });
  if (!role) throw invalidRole(`The ${key} role is missing. Restart the server to restore it.`);
  return role.id;
}

async function resolveAccountRole(roleId, accountType, companyId) {
  if (!roleId) return roleIdFor(ACCOUNT_DEFAULT_ROLE[accountType]);

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, isSystem: true, companyId: true, status: true },
  });
  const usable =
    role && !role.isSystem && role.status === "ACTIVE" && (role.companyId === null || role.companyId === companyId);
  if (!usable) throw invalidRole("Select a valid login role for this account!");
  return role.id;
}

async function detachForeignRoles(tx, where, companyId, accountType) {
  const fallback = await roleIdFor(ACCOUNT_DEFAULT_ROLE[accountType]);
  await tx.user.updateMany({
    where: { ...where, role: { companyId: { not: null, notIn: [companyId ?? ""] } } },
    data: { roleId: fallback },
  });
}

module.exports = { syncRoles, roleAccessSelect, accessOf, resolveAccountRole, roleIdFor, detachForeignRoles };
