const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");

const ORDER_TYPES = ["DINE_IN", "TAKEAWAY", "DELIVERY"];
const ORDER_STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED"];
const SEARCH_FIELDS = ["orderNumber", "customerName", "tableNumber"];
const ITEM_SEARCH_FIELDS = ["name", "description"];
const MAX_QUANTITY = 999;
const ORDER_NUMBER_RETRIES = 5;

const staffSelect = { id: true, firstName: true, lastName: true, badgeNumber: true, designation: true };

const listInclude = {
  outlet: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
  server: { select: staffSelect },
  _count: { select: { items: true } },
};

const listWithItems = {
  ...listInclude,
  items: { select: { id: true, itemName: true, quantity: true }, orderBy: { createdAt: "asc" } },
};

const detailInclude = {
  outlet: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
      contactPersonPhone: true,
      parent: { select: { id: true, name: true, companyLogo: true } },
    },
  },
  server: { select: staffSelect },
  createdBy: { select: { id: true, email: true } },
  items: { orderBy: { createdAt: "asc" } },
};

const toMoney = (value) => Math.round(value * 100) / 100;

const cleanText = (value, max) => {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
};

const fail = (message, status) => Object.assign(new Error(message), { status });

async function resolveOutlet(req, requested) {
  const own = await branch.viewerOutlet(req.user);
  if (own && requested && requested !== own) {
    throw fail("You can only manage orders of your own outlet!", 403);
  }
  return own ?? requested ?? null;
}

async function findOrder(req, include) {
  const order = await prisma.salesOrder.findUnique({ where: { id: req.params.id }, include });
  if (!order) return null;
  const own = await branch.viewerOutlet(req.user);
  return own && order.branchId !== own ? null : order;
}

function confirmedRange({ from, to }) {
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  const range = {
    ...(start && !Number.isNaN(start.getTime()) ? { gte: start } : {}),
    ...(end && !Number.isNaN(end.getTime()) ? { lte: end } : {}),
  };
  return Object.keys(range).length ? { confirmedAt: range } : {};
}

function mergeItems(items) {
  const merged = new Map();
  for (const entry of [items].flat()) {
    if (!entry?.menuItemId) continue;
    merged.set(entry.menuItemId, (merged.get(entry.menuItemId) ?? 0) + Number(entry.quantity));
  }
  return [...merged].map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
}

function validateOrder(body, items) {
  if (!body.serverId) return "Select the server taking this order!";
  if (body.orderType && !ORDER_TYPES.includes(body.orderType)) return "Invalid order type!";
  if (!items.length) return "Add at least one item to the order!";
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
    return "Item quantity must be a whole number of 1 or more!";
  }
  if (items.some((item) => item.quantity > MAX_QUANTITY)) {
    return `Item quantity cannot be more than ${MAX_QUANTITY}!`;
  }
  return null;
}

async function nextOrderNumber(tx, branchId) {
  const now = new Date();
  const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  const prefix = `SO-${day}-`;
  const last = await tx.salesOrder.findFirst({
    where: { branchId, orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const sequence = last ? Number(last.orderNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}

async function placeOrder(tx, { branchId, serverId, createdById, body, items }) {
  const rows = await tx.menuItemOutlet.findMany({
    where: { branchId, menuItemId: { in: items.map((item) => item.menuItemId) } },
    include: {
      menuItem: {
        select: {
          id: true,
          name: true,
          status: true,
          menuItemPrices: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
  const byItem = new Map(rows.map((row) => [row.menuItemId, row]));

  const lines = [];
  for (const item of items) {
    const row = byItem.get(item.menuItemId);
    if (!row || row.menuItem.status !== "AVAILABLE") {
      throw fail(`${row?.menuItem.name ?? "An item"} is not available at this outlet!`, 422);
    }

    const unitPrice = branch.effectivePrice(row.menuItem.menuItemPrices?.[0], row.price);
    if (unitPrice === null) {
      throw fail(`${row.menuItem.name} has no price set!`, 422);
    }

    const updated = await tx.menuItemOutlet.updateMany({
      where: { id: row.id, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (!updated.count) {
      throw fail(`Only ${row.stock} ${row.menuItem.name} left in stock!`, 409);
    }

    lines.push({
      menuItemId: row.menuItemId,
      itemName: row.menuItem.name,
      unitPrice,
      quantity: item.quantity,
      lineTotal: toMoney(unitPrice * item.quantity),
    });
  }

  const orderType = body.orderType ?? "DINE_IN";

  return tx.salesOrder.create({
    data: {
      branchId,
      serverId,
      createdById,
      orderNumber: await nextOrderNumber(tx, branchId),
      orderType,
      tableNumber: orderType === "DINE_IN" ? cleanText(body.tableNumber, 30) : null,
      customerName: cleanText(body.customerName, 100),
      note: cleanText(body.note, 255),
      totalItems: lines.reduce((sum, line) => sum + line.quantity, 0),
      totalAmount: toMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0)),
      items: { create: lines },
    },
    include: detailInclude,
  });
}

class SalesOrder {
  async stockedItems(req, res) {
    try {
      const branchId = await resolveOutlet(req, req.query.branchId);
      if (!branchId) {
        return response.error(res, "Select an outlet to list its items!", 422);
      }

      const list = branch.listParams(req.query);
      const where = {
        branchId,
        stock: { gt: 0 },
        menuItem: {
          status: "AVAILABLE",
          ...(req.query.menuId ? { menuId: req.query.menuId } : {}),
          ...branch.searchWhere(list.search, ITEM_SEARCH_FIELDS),
        },
      };

      const [rows, total] = await prisma.$transaction([
        prisma.menuItemOutlet.findMany({
          where,
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                menuItemImage: true,
                menu: { select: { id: true, name: true } },
                menuItemPrices: { orderBy: { createdAt: "desc" }, take: 1 },
              },
            },
          },
          orderBy: { menuItem: { name: "asc" } },
          skip: list.skip,
          take: list.take,
        }),
        prisma.menuItemOutlet.count({ where }),
      ]);

      const items = rows.map((row) => ({
        id: row.menuItem.id,
        outletItemId: row.id,
        name: row.menuItem.name,
        description: row.menuItem.description,
        image: row.menuItem.menuItemImage,
        menu: row.menuItem.menu,
        stock: row.stock,
        price: branch.effectivePrice(row.menuItem.menuItemPrices?.[0], row.price),
      }));

      return response.list(res, items, total, "Stocked Items Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Item");
    }
  }

  async list(req, res) {
    try {
      const list = branch.listParams(req.query, {
        sortable: ["orderNumber", "totalAmount", "totalItems", "status", "confirmedAt", "createdAt"],
      });
      const branchId = await resolveOutlet(req, req.query.branchId);
      const where = {
        ...(branchId ? { branchId } : {}),
        ...(req.query.companyId ? { outlet: { parentId: req.query.companyId } } : {}),
        ...(ORDER_STATUSES.includes(req.query.status) ? { status: req.query.status } : {}),
        ...(ORDER_TYPES.includes(req.query.orderType) ? { orderType: req.query.orderType } : {}),
        ...(req.query.serverId ? { serverId: req.query.serverId } : {}),
        ...confirmedRange(req.query),
        ...branch.searchWhere(list.search, SEARCH_FIELDS),
      };

      const [orders, total] = await prisma.$transaction([
        prisma.salesOrder.findMany({
          where,
          include: req.query.withItems === "1" ? listWithItems : listInclude,
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.salesOrder.count({ where }),
      ]);

      return response.list(res, orders, total, "Sales Order List Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Sales Order");
    }
  }

  async details(req, res) {
    try {
      const order = await findOrder(req, detailInclude);
      if (!order) {
        return response.notFoundError(res, "Sales Order Not Found!");
      }

      return response.success(res, order, "Sales Order Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Sales Order");
    }
  }

  async create(req, res) {
    try {
      const items = mergeItems(req.body.items);
      const invalid = validateOrder(req.body, items);
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      const branchId = await resolveOutlet(req, req.body.branchId);
      const outlet = branchId
        ? await prisma.company.findFirst({
            where: { id: branchId, parentId: { not: null } },
            select: { id: true, status: true },
          })
        : null;
      if (!outlet) {
        return response.error(res, "Select a valid outlet for this order!", 422);
      }
      if (outlet.status !== "ACTIVE") {
        return response.error(res, "This outlet is inactive and cannot take orders!", 422);
      }

      const server = await prisma.staff.findFirst({
        where: { id: req.body.serverId, branchId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!server) {
        return response.error(res, "Select an active server of this outlet!", 422);
      }

      let order = null;
      for (let attempt = 1; !order; attempt += 1) {
        try {
          order = await prisma.$transaction((tx) =>
            placeOrder(tx, {
              branchId,
              serverId: server.id,
              createdById: req.user?.userId ?? null,
              body: req.body,
              items,
            }),
          );
        } catch (error) {
          if (error.code !== "P2002" || attempt >= ORDER_NUMBER_RETRIES) throw error;
        }
      }

      return response.insertionSuccess(res, order, `Order ${order.orderNumber} Confirmed Successfully`);
    } catch (error) {
      return branch.handleError(res, error, "Sales Order");
    }
  }

  async complete(req, res) {
    try {
      const order = await findOrder(req);
      if (!order) {
        return response.notFoundError(res, "Sales Order Not Found!");
      }
      if (order.status !== "CONFIRMED") {
        return response.error(res, "Only confirmed orders can be completed!", 422);
      }

      const updated = await prisma.salesOrder.update({
        where: { id: order.id },
        data: { status: "COMPLETED", completedAt: new Date() },
        include: detailInclude,
      });

      return response.updateSuccess(res, updated, `Order ${updated.orderNumber} Completed`);
    } catch (error) {
      return branch.handleError(res, error, "Sales Order");
    }
  }

  async cancel(req, res) {
    try {
      const order = await findOrder(req, { items: true });
      if (!order) {
        return response.notFoundError(res, "Sales Order Not Found!");
      }
      if (order.status !== "CONFIRMED") {
        return response.error(res, "Only confirmed orders can be cancelled!", 422);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.salesOrder.updateMany({
          where: { id: order.id, status: "CONFIRMED" },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
        if (!changed.count) {
          throw fail("Only confirmed orders can be cancelled!", 422);
        }

        for (const item of order.items) {
          await tx.menuItemOutlet.updateMany({
            where: { menuItemId: item.menuItemId, branchId: order.branchId },
            data: { stock: { increment: item.quantity } },
          });
        }

        return tx.salesOrder.findUnique({ where: { id: order.id }, include: detailInclude });
      });

      return response.updateSuccess(res, updated, `Order ${updated.orderNumber} Cancelled & Stock Restored`);
    } catch (error) {
      return branch.handleError(res, error, "Sales Order");
    }
  }

  async slip(req, res) {
    try {
      const order = await findOrder(req);
      if (!order) {
        return response.notFoundError(res, "Sales Order Not Found!");
      }
      if (order.status === "CANCELLED") {
        return response.error(res, "A cancelled order has no slip!", 422);
      }

      const updated = await prisma.salesOrder.update({
        where: { id: order.id },
        data: { slipPrintedAt: new Date() },
        include: detailInclude,
      });

      return response.updateSuccess(res, updated, "Order Slip Generated");
    } catch (error) {
      return branch.handleError(res, error, "Sales Order");
    }
  }
}

const salesOrder = new SalesOrder();
module.exports = salesOrder;
