const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");

const ITEM_STATUSES = ["AVAILABLE", "UNAVAILABLE", "DISCONTINUED", "SOLD_OUT"];
const SEARCH_FIELDS = ["name", "description"];

const itemInclude = {
  menu: { select: { id: true, name: true } },
  menuItemPrices: { orderBy: { createdAt: "desc" }, take: 1 },
  _count: { select: { itemOutlets: true } },
};

const outletSelect = {
  id: true,
  name: true,
  city: true,
  status: true,
  parent: { select: { id: true, name: true } },
};

function defaultPrice(latest) {
  if (!latest) return null;
  return Number(latest.price) > 0 ? Number(latest.price) : Number(latest.basePrice);
}

function effectivePrice(latest, override) {
  return override !== null && override !== undefined ? Number(override) : defaultPrice(latest);
}

function toAmount(value) {
  if (value === undefined || value === null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function pickData(body) {
  return {
    menuId: body.menuId,
    name: String(body.name ?? "").trim(),
    description: body.description ? String(body.description).trim() : null,
    menuItemImage: body.menuItemImage ? String(body.menuItemImage).trim() : null,
    ...(body.status ? { status: body.status } : {}),
  };
}

function validateBody(body) {
  if (!body.menuId) return "Menu is required!";
  if (!String(body.name ?? "").trim()) return "Item name is required!";
  if (body.status && !ITEM_STATUSES.includes(body.status)) return "Invalid item status!";
  const basePrice = toAmount(body.basePrice);
  const price = toAmount(body.price);
  if (basePrice === null) return "Base price is required!";
  if (basePrice === undefined) return "Base price must be a positive number!";
  if (price === undefined) return "Price must be a positive number!";
  return null;
}

function priceData(body) {
  const basePrice = toAmount(body.basePrice);
  const price = toAmount(body.price);
  return { basePrice, price: price ?? basePrice };
}

async function findMenu(menuId) {
  return prisma.menu.findUnique({ where: { id: menuId }, select: { id: true } });
}

class MenuItem {
  async list(req, res) {
    try {
      const list = branch.listParams(req.query, { sortable: ["name", "status", "createdAt"] });
      const { outletId, excludeOutletId, stockStatus } = req.query;
      const stockWhere =
        stockStatus === "out" ? { stock: { lte: 0 } } : stockStatus === "in" ? { stock: { gt: 0 } } : {};
      const where = {
        ...(req.query.menuId ? { menuId: req.query.menuId } : {}),
        ...(req.query.status ? { status: req.query.status } : {}),
        ...(outletId ? { itemOutlets: { some: { branchId: outletId, ...stockWhere } } } : {}),
        ...(excludeOutletId ? { itemOutlets: { none: { branchId: excludeOutletId } } } : {}),
        ...branch.searchWhere(list.search, SEARCH_FIELDS),
      };

      const [rows, total] = await prisma.$transaction([
        prisma.menuItem.findMany({
          where,
          include: {
            ...itemInclude,
            ...(outletId
              ? {
                  itemOutlets: {
                    where: { branchId: outletId },
                    select: { id: true, price: true, stock: true, createdAt: true },
                  },
                }
              : {}),
          },
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.menuItem.count({ where }),
      ]);

      const items = rows.map((row) => {
        const latest = row.menuItemPrices?.[0];
        const override = row.itemOutlets?.[0]?.price ?? null;
        return {
          ...row,
          defaultPrice: defaultPrice(latest),
          ...(outletId
            ? {
                outletPrice: override,
                effectivePrice: effectivePrice(latest, override),
                stock: row.itemOutlets?.[0]?.stock ?? 0,
              }
            : {}),
        };
      });

      return response.list(res, items, total, "Menu Item List Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu Item");
    }
  }

  async details(req, res) {
    try {
      const item = await prisma.menuItem.findUnique({
        where: { id: req.params.id },
        include: { ...itemInclude, menuItemPrices: { orderBy: { createdAt: "desc" } } },
      });

      if (!item) {
        return response.notFoundError(res, "Menu Item Not Found!");
      }

      return response.success(res, item, "Menu Item Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu Item");
    }
  }

  async create(req, res) {
    try {
      const invalid = validateBody(req.body);
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      if (!(await findMenu(req.body.menuId))) {
        return response.error(res, "Select a valid menu for this item!", 422);
      }

      const item = await prisma.menuItem.create({
        data: {
          ...pickData(req.body),
          menuItemPrices: { create: priceData(req.body) },
        },
        include: itemInclude,
      });

      return response.insertionSuccess(res, item, "Menu Item Created Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu Item");
    }
  }

  async update(req, res) {
    try {
      const invalid = validateBody(req.body);
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      if (!(await findMenu(req.body.menuId))) {
        return response.error(res, "Select a valid menu for this item!", 422);
      }

      const item = await prisma.$transaction(async (tx) => {
        await tx.menuItem.update({ where: { id: req.params.id }, data: pickData(req.body) });

        const next = priceData(req.body);
        const latest = await tx.menuItemPrice.findFirst({
          where: { menuItemId: req.params.id },
          orderBy: { createdAt: "desc" },
        });
        const changed =
          !latest ||
          Number(latest.basePrice) !== next.basePrice ||
          Number(latest.price) !== next.price;
        if (changed) {
          await tx.menuItemPrice.create({ data: { ...next, menuItemId: req.params.id } });
        }

        return tx.menuItem.findUnique({ where: { id: req.params.id }, include: itemInclude });
      });

      return response.updateSuccess(res, item, "Menu Item Updated Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu Item");
    }
  }

  async outlets(req, res) {
    try {
      const item = await prisma.menuItem.findUnique({
        where: { id: req.params.id },
        include: { menuItemPrices: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      if (!item) {
        return response.notFoundError(res, "Menu Item Not Found!");
      }

      const list = branch.listParams(req.query, { sortable: ["createdAt", "price"] });
      const outletWhere = {
        ...(req.query.companyId ? { parentId: req.query.companyId } : {}),
        ...branch.searchWhere(list.search, ["name", "city"]),
      };
      const where = {
        menuItemId: req.params.id,
        ...(Object.keys(outletWhere).length ? { outlet: outletWhere } : {}),
      };

      const [rows, total] = await prisma.$transaction([
        prisma.menuItemOutlet.findMany({
          where,
          include: { outlet: { select: outletSelect } },
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.menuItemOutlet.count({ where }),
      ]);

      const latest = item.menuItemPrices?.[0];
      const assigned = rows.map((row) => ({
        ...row,
        defaultPrice: defaultPrice(latest),
        effectivePrice: effectivePrice(latest, row.price),
      }));

      return response.list(res, assigned, total, "Assigned Outlets Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu Item");
    }
  }

  async assignOutlets(req, res) {
    try {
      const entries = [].concat(req.body.outlets ?? []).filter((entry) => entry?.outletId);
      const outletIds = [...new Set(entries.map((entry) => entry.outletId))];
      if (!outletIds.length) {
        return response.error(res, "Select at least one outlet!", 422);
      }

      if (entries.some((entry) => toAmount(entry.price) === undefined)) {
        return response.error(res, "Outlet price must be a positive number!", 422);
      }

      if (entries.some((entry) => branch.toStock(entry.stock) === undefined)) {
        return response.error(res, "Stock must be a whole number of 0 or more!", 422);
      }

      const item = await prisma.menuItem.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });
      if (!item) {
        return response.notFoundError(res, "Menu Item Not Found!");
      }

      const outlets = await prisma.company.count({
        where: { id: { in: outletIds }, parentId: { not: null } },
      });
      if (outlets !== outletIds.length) {
        return response.error(res, "Select valid outlets only!", 422);
      }

      await prisma.$transaction(
        entries.map((entry) =>
          prisma.menuItemOutlet.upsert({
            where: { menuItemId_branchId: { menuItemId: req.params.id, branchId: entry.outletId } },
            create: {
              menuItemId: req.params.id,
              branchId: entry.outletId,
              price: toAmount(entry.price),
              stock: branch.toStock(entry.stock) ?? 0,
            },
            update: {
              price: toAmount(entry.price),
              ...(branch.toStock(entry.stock) !== null ? { stock: branch.toStock(entry.stock) } : {}),
            },
          }),
        ),
      );

      return response.insertionSuccess(
        res,
        { assigned: outletIds.length },
        `${outletIds.length} Outlet${outletIds.length === 1 ? "" : "s"} Assigned Successfully`,
      );
    } catch (error) {
      return branch.handleError(res, error, "Menu Item");
    }
  }

  async updateOutlet(req, res) {
    try {
      const data = {};

      if ("price" in req.body) {
        const price = toAmount(req.body.price);
        if (price === undefined) {
          return response.error(res, "Outlet price must be a positive number!", 422);
        }
        data.price = price;
      }

      if ("stock" in req.body) {
        const stock = branch.toStock(req.body.stock);
        if (stock === undefined) {
          return response.error(res, "Stock must be a whole number of 0 or more!", 422);
        }
        data.stock = stock ?? 0;
      }

      if (!Object.keys(data).length) {
        return response.error(res, "Nothing to update!", 422);
      }

      const assignment = await prisma.menuItemOutlet.update({
        where: {
          menuItemId_branchId: { menuItemId: req.params.id, branchId: req.params.outletId },
        },
        data,
      });

      return response.updateSuccess(res, assignment, "Outlet Price & Stock Updated Successfully");
    } catch (error) {
      if (error.code === "P2025") {
        return response.notFoundError(res, "Item is not assigned to this outlet!");
      }
      return branch.handleError(res, error, "Menu Item");
    }
  }

  async unassignOutlet(req, res) {
    try {
      const assignment = await prisma.menuItemOutlet.delete({
        where: {
          menuItemId_branchId: { menuItemId: req.params.id, branchId: req.params.outletId },
        },
      });

      return response.deletionSuccess(res, assignment, "Item Removed From Outlet");
    } catch (error) {
      if (error.code === "P2025") {
        return response.notFoundError(res, "Item is not assigned to this outlet!");
      }
      return branch.handleError(res, error, "Menu Item");
    }
  }

  async remove(req, res) {
    try {
      const item = await prisma.$transaction(async (tx) => {
        await tx.menuItemPrice.deleteMany({ where: { menuItemId: req.params.id } });
        return tx.menuItem.delete({ where: { id: req.params.id } });
      });

      return response.deletionSuccess(res, item, "Menu Item Deleted Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu Item");
    }
  }
}

const menuItem = new MenuItem();
module.exports = menuItem;
