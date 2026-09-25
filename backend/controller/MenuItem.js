const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");

const ITEM_STATUSES = ["AVAILABLE", "UNAVAILABLE", "DISCONTINUED", "SOLD_OUT"];
const SEARCH_FIELDS = ["name", "description"];

const itemInclude = {
  menu: { select: { id: true, name: true } },
  menuItemPrices: { orderBy: { createdAt: "desc" }, take: 1 },
};

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
      const page = branch.paging(req.query);
      const search = String(req.query.search ?? "").trim();
      const contains = { contains: search, mode: "insensitive" };
      const where = {
        ...(req.query.menuId ? { menuId: req.query.menuId } : {}),
        ...(req.query.status ? { status: req.query.status } : {}),
        ...(search ? { OR: SEARCH_FIELDS.map((field) => ({ [field]: contains })) } : {}),
      };

      const [total, items] = await prisma.$transaction([
        prisma.menuItem.count({ where }),
        prisma.menuItem.findMany({
          where,
          include: itemInclude,
          orderBy: { createdAt: "desc" },
          skip: page.skip,
          take: page.take,
        }),
      ]);

      return response.success(res, branch.paginated(items, total, page), "Menu Item List Fetched Successfully");
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
