const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");
const {
  DEFAULT_NEW_ROLE_PERMISSIONS,
  HQ_ONLY_PERMISSIONS,
  PERMISSION_GROUPS,
  assignablePermissions,
  effectivePermissions,
} = require("../helper/Permissions");

const NAME_LIMIT = 40;
const DESCRIPTION_LIMIT = 160;
const STATUSES = ["ACTIVE", "INACTIVE"];

const roleSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  isSystem: true,
  status: true,
  companyId: true,
  company: { select: { id: true, name: true } },
  _count: { select: { users: true } },
  permissionBatches: {
    where: { status: "ACTIVE", permission: { status: "ACTIVE" } },
    select: { permission: { select: { slug: true } } },
  },
};

const roleOrder = [{ isSystem: "desc" }, { companyId: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }];

const isDeveloper = (viewer) => viewer.accountType === "DEVELOPER";

const visibleRoles = (viewer) =>
  isDeveloper(viewer) ? {} : { OR: [{ companyId: null }, { companyId: viewer.branchId ?? "" }] };

const canEdit = (role, viewer) =>
  !role.isSystem && (isDeveloper(viewer) || (!!role.companyId && role.companyId === viewer.branchId));

const toRow = (role, viewer) => ({
  id: role.id,
  key: role.key,
  name: role.name,
  description: role.description,
  status: role.status,
  isSystem: role.isSystem,
  shared: !role.companyId,
  company: role.company,
  editable: canEdit(role, viewer),
  userCount: role._count.users,
  permissions: effectivePermissions(
    role.key,
    role.permissionBatches.map((batch) => batch.permission.slug),
  ),
});

const fail = (message, status) => Object.assign(new Error(message), { status });

function keyFrom(name) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `${base || "ROLE"}_${Date.now().toString(36).toUpperCase()}`;
}

function readName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) throw fail("Role name is required!", 422);
  if (name.length > NAME_LIMIT) throw fail(`Role name must be ${NAME_LIMIT} characters or less!`, 422);
  return name;
}

function readDescription(value) {
  const description = typeof value === "string" ? value.trim() : "";
  if (description.length > DESCRIPTION_LIMIT) {
    throw fail(`Description must be ${DESCRIPTION_LIMIT} characters or less!`, 422);
  }
  return description || null;
}

function roleChanges(body) {
  const data = {};
  if (body?.name !== undefined) data.name = readName(body.name);
  if (body?.description !== undefined) data.description = readDescription(body.description);
  if (body?.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw fail("Invalid role status!", 422);
    data.status = body.status;
  }
  return data;
}

async function editableRole(id, viewer) {
  const role = await prisma.role.findFirst({ where: { AND: [{ id }, visibleRoles(viewer)] }, select: roleSelect });
  if (!role) throw fail("Role Not Found!", 404);
  if (role.isSystem) throw fail("The built-in Super Admin role cannot be changed", 422);
  if (!canEdit(role, viewer)) throw fail("Shared roles are managed by the developer", 403);
  return role;
}

async function replacePermissions(tx, roleId, keys) {
  const permissions = await tx.permission.findMany({
    where: { slug: { in: assignablePermissions(keys) }, status: "ACTIVE" },
    select: { id: true },
  });
  const ids = permissions.map((permission) => permission.id);
  await tx.permissionBatch.deleteMany({ where: { roleId, permissionId: { notIn: ids } } });
  await tx.permissionBatch.createMany({
    data: ids.map((permissionId) => ({ roleId, permissionId })),
    skipDuplicates: true,
  });
  await tx.permissionBatch.updateMany({ where: { roleId }, data: { status: "ACTIVE" } });
}

async function assignableCompany(viewer, requested) {
  if (isDeveloper(viewer)) return requested || null;
  if (viewer.accountType === "HEADQUARTER") return viewer.branchId;
  const outlet = await prisma.company.findUnique({
    where: { id: viewer.branchId ?? "" },
    select: { parentId: true },
  });
  return outlet?.parentId ?? null;
}

async function rowOf(id, viewer) {
  return toRow(await prisma.role.findUnique({ where: { id }, select: roleSelect }), viewer);
}

class Role {
  async list(req, res) {
    try {
      const roles = await prisma.role.findMany({ where: visibleRoles(req.user), select: roleSelect, orderBy: roleOrder });
      return response.success(
        res,
        {
          groups: PERMISSION_GROUPS,
          hqOnly: HQ_ONLY_PERMISSIONS,
          roles: roles.map((role) => toRow(role, req.user)),
        },
        "Roles Fetched Successfully",
      );
    } catch (error) {
      return branch.handleError(res, error, "Role");
    }
  }

  async options(req, res) {
    try {
      const companyId = await assignableCompany(req.user, req.query.companyId);
      const roles = await prisma.role.findMany({
        where: {
          isSystem: false,
          status: "ACTIVE",
          OR: [{ companyId: null }, ...(companyId ? [{ companyId }] : [])],
        },
        select: { id: true, key: true, name: true, description: true, companyId: true },
        orderBy: roleOrder.slice(1),
      });
      return response.success(
        res,
        roles.map(({ companyId: owner, ...role }) => ({ ...role, shared: !owner })),
        "Role Options Fetched Successfully",
      );
    } catch (error) {
      return branch.handleError(res, error, "Role");
    }
  }

  async create(req, res) {
    try {
      const name = readName(req.body?.name);
      const description = readDescription(req.body?.description);
      const companyId = isDeveloper(req.user) ? null : req.user.branchId;
      if (!isDeveloper(req.user) && !companyId) {
        return response.error(res, "Only headquarter accounts can create roles!", 403);
      }

      const role = await prisma.$transaction(async (tx) => {
        const created = await tx.role.create({ data: { key: keyFrom(name), name, description, companyId } });
        await replacePermissions(tx, created.id, req.body?.permissions ?? DEFAULT_NEW_ROLE_PERMISSIONS);
        return created;
      });

      return response.insertionSuccess(res, await rowOf(role.id, req.user), "Role Created Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Role");
    }
  }

  async update(req, res) {
    try {
      const role = await editableRole(req.params.id, req.user);
      const data = roleChanges(req.body);

      await prisma.$transaction(async (tx) => {
        if (Object.keys(data).length) await tx.role.update({ where: { id: role.id }, data });
        if (req.body?.permissions !== undefined) await replacePermissions(tx, role.id, req.body.permissions);
      });

      return response.updateSuccess(res, await rowOf(role.id, req.user), "Role Saved");
    } catch (error) {
      return branch.handleError(res, error, "Role");
    }
  }

  async remove(req, res) {
    try {
      const role = await editableRole(req.params.id, req.user);
      if (role._count.users > 0) {
        return response.error(
          res,
          `${role._count.users} account(s) still hold "${role.name}". Move them to another role first!`,
          422,
        );
      }

      await prisma.$transaction([
        prisma.permissionBatch.deleteMany({ where: { roleId: role.id } }),
        prisma.role.delete({ where: { id: role.id } }),
      ]);

      return response.deletionSuccess(res, { id: role.id }, "Role Deleted Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Role");
    }
  }
}

const roleController = new Role();
module.exports = roleController;
