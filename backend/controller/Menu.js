const prisma = require("../config/prisma");
const { Prisma } = require("../../generated/prisma");
const response = require("./Response");
const branch = require("./Branch");

const SEARCH_FIELDS = ["name", "description"];

const menuInclude = { _count: { select: { menuItems: true } } };

const outletMenuInclude = (branchId) => ({
  _count: { select: { menuItems: { where: { itemOutlets: { some: { branchId } } } } } },
});


function pickData(body) {
  return {
    name: String(body.name ?? "").trim(),
    description: body.description ? String(body.description).trim() : null,
    menuImage: body.menuImage ? String(body.menuImage).trim() : null,
    ...(body.status ? { status: body.status } : {}),
  };
}

function validateBody(body) {
  if (!String(body.name ?? "").trim()) return "Menu name is required!";
  if (body.status && !["ACTIVE", "INACTIVE"].includes(body.status)) return "Invalid status!";
  return null;
}

async function withOutletCount(menus) {
  const list = [].concat(menus);
  if (!list.length) return menus;

  const rows = await prisma.$queryRaw`
    SELECT mi."menuId" AS "menuId", COUNT(DISTINCT mio."branchId")::int AS "outlets"
    FROM "MenuItemOutlet" mio
    JOIN "MenuItem" mi ON mi."id" = mio."menuItemId"
    WHERE mi."menuId" IN (${Prisma.join(list.map((menu) => menu.id))})
    GROUP BY mi."menuId"
  `;
  const counts = Object.fromEntries(rows.map((row) => [row.menuId, row.outlets]));
  const result = list.map((menu) => ({ ...menu, outletCount: counts[menu.id] ?? 0 }));

  return Array.isArray(menus) ? result : result[0];
}

class Menu {
  async list(req, res) {
    try {
      const list = branch.listParams(req.query, { sortable: ["name", "status", "createdAt"] });
      const outletId = (await branch.viewerOutlet(req.user)) ?? req.query.outletId;
      const where = {
        ...(req.query.status ? { status: req.query.status } : {}),
        ...(outletId
          ? { menuItems: { some: { itemOutlets: { some: { branchId: outletId } } } } }
          : {}),
        ...branch.searchWhere(list.search, SEARCH_FIELDS),
      };

      const [menus, total] = await prisma.$transaction([
        prisma.menu.findMany({
          where,
          include: outletId ? outletMenuInclude(outletId) : menuInclude,
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.menu.count({ where }),
      ]);

      return response.list(res, await withOutletCount(menus), total, "Menu List Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async details(req, res) {
    try {
      const menu = await prisma.menu.findUnique({
        where: { id: req.params.id },
        include: menuInclude,
      });

      if (!menu) {
        return response.notFoundError(res, "Menu Not Found!");
      }

      return response.success(res, await withOutletCount(menu), "Menu Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async create(req, res) {
    try {
      const invalid = validateBody(req.body);
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      const menu = await prisma.menu.create({
        data: pickData(req.body),
        include: menuInclude,
      });

      return response.insertionSuccess(res, menu, "Menu Created Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async update(req, res) {
    try {
      const invalid = validateBody(req.body);
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      const menu = await prisma.menu.update({
        where: { id: req.params.id },
        data: pickData(req.body),
        include: menuInclude,
      });

      return response.updateSuccess(res, menu, "Menu Updated Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async changeStatus(req, res) {
    try {
      const current = await prisma.menu.findUnique({
        where: { id: req.params.id },
        select: { status: true },
      });

      if (!current) {
        return response.notFoundError(res, "Menu Not Found!");
      }

      const menu = await prisma.menu.update({
        where: { id: req.params.id },
        data: { status: current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
        include: menuInclude,
      });

      return response.updateSuccess(res, menu, `Menu Marked ${menu.status}`);
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async remove(req, res) {
    try {
      const items = await prisma.menuItem.count({ where: { menuId: req.params.id } });
      if (items) {
        return response.error(res, "Remove the items of this menu first!", 409);
      }

      const menu = await prisma.menu.delete({ where: { id: req.params.id } });

      return response.deletionSuccess(res, menu, "Menu Deleted Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }
}

const menu = new Menu();
module.exports = menu;
