const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");

const { LOW_STOCK_LIMIT, CRITICAL_STOCK_LIMIT } = branch;
const SOLD = { in: ["CONFIRMED", "COMPLETED"] };

function dayRange(offset = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

function change(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const fail = (message, status) => Object.assign(new Error(message), { status });

async function salesOn(scope, range) {
  const result = await prisma.salesOrder.aggregate({
    where: { ...scope, status: SOLD, confirmedAt: range },
    _sum: { totalAmount: true },
    _count: { _all: true },
  });
  return { amount: Number(result._sum.totalAmount ?? 0), orders: result._count._all };
}

async function outletOf(req) {
  return (await branch.viewerOutlet(req.user)) ?? req.query.branchId;
}

async function companyScope(req) {
  const accountType = req.user?.accountType;
  if (!["HEADQUARTER", "DEVELOPER"].includes(accountType)) {
    throw fail("Only headquarters can see the company dashboard!", 403);
  }
  if (accountType === "DEVELOPER") {
    return req.query.companyId ? { outlet: { parentId: req.query.companyId } } : { outlet: { parentId: { not: null } } };
  }
  const viewer = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { branchId: true } });
  if (!viewer?.branchId) throw fail("Unauthorized Access!", 401);
  return { outlet: { parentId: viewer.branchId } };
}

async function figures(scope) {
  const [today, yesterday, staffActive, onShift, onBreak, lowStock, criticalStock] = await Promise.all([
    salesOn(scope, dayRange(0)),
    salesOn(scope, dayRange(-1)),
    prisma.staff.count({ where: { ...scope, status: "ACTIVE" } }),
    prisma.staffShift.count({ where: { ...scope, status: "ON_SHIFT" } }),
    prisma.staffShiftBreak.count({ where: { endAt: null, shift: { ...scope, status: "ON_SHIFT" } } }),
    prisma.menuItemOutlet.count({ where: { ...scope, stock: { lte: LOW_STOCK_LIMIT } } }),
    prisma.menuItemOutlet.count({ where: { ...scope, stock: { lte: CRITICAL_STOCK_LIMIT } } }),
  ]);

  return {
    sales: { today: today.amount, yesterday: yesterday.amount, change: change(today.amount, yesterday.amount) },
    orders: { today: today.orders, yesterday: yesterday.orders, change: change(today.orders, yesterday.orders) },
    staff: { onShift, onBreak, active: staffActive },
    stock: { low: lowStock, critical: criticalStock, lowLimit: LOW_STOCK_LIMIT, criticalLimit: CRITICAL_STOCK_LIMIT },
  };
}

async function salesByOutlet(scope, range) {
  const groups = await prisma.salesOrder.groupBy({
    by: ["branchId"],
    where: { ...scope, status: SOLD, confirmedAt: range },
    _count: { _all: true },
    _sum: { totalAmount: true, totalItems: true },
  });
  return new Map(
    groups.map((group) => [
      group.branchId,
      { orders: group._count._all, items: group._sum.totalItems ?? 0, revenue: Number(group._sum.totalAmount ?? 0) },
    ]),
  );
}

async function outletBreakdown(scope) {
  const [outlets, today, yesterday] = await Promise.all([
    prisma.company.findMany({
      where: { parentId: scope.outlet.parentId, ...branch.withoutDeveloper },
      select: { id: true, name: true, status: true, parent: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    salesByOutlet(scope, dayRange(0)),
    salesByOutlet(scope, dayRange(-1)),
  ]);
  const empty = { orders: 0, items: 0, revenue: 0 };
  const revenue = [...today.values()].reduce((sum, row) => sum + row.revenue, 0);

  return outlets
    .map((outlet) => {
      const now = today.get(outlet.id) ?? empty;
      const before = yesterday.get(outlet.id) ?? empty;
      return {
        id: outlet.id,
        name: outlet.name,
        company: outlet.parent?.name ?? null,
        status: outlet.status,
        orders: now.orders,
        items: now.items,
        revenue: now.revenue,
        average: now.orders ? Math.round((now.revenue / now.orders) * 100) / 100 : 0,
        share: revenue ? Math.round((now.revenue / revenue) * 1000) / 10 : 0,
        yesterday: before.revenue,
        change: change(now.revenue, before.revenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
}

const TREND_DAYS = 7;
const MAX_SERIES = 8;

const pad = (value) => String(value).padStart(2, "0");
const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function lastDays(count) {
  return Array.from({ length: count }, (_, index) => dayKey(new Date(dayRange(index - count + 1).gte)));
}

function foldSeries(series) {
  if (series.length <= MAX_SERIES) return series;
  const kept = series.slice(0, MAX_SERIES - 1);
  const rest = series.slice(MAX_SERIES - 1);
  const values = kept[0].values.map((_, index) => rest.reduce((sum, row) => sum + row.values[index], 0));
  return [...kept, { id: "other", name: `Other (${rest.length})`, values, total: values.reduce((a, b) => a + b, 0) }];
}

async function revenueTrend(scope) {
  const days = lastDays(TREND_DAYS);
  const range = { gte: dayRange(1 - TREND_DAYS).gte, lt: dayRange(0).lt };
  const [outlets, orders] = await Promise.all([
    prisma.company.findMany({
      where: { parentId: scope.outlet.parentId, ...branch.withoutDeveloper },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.salesOrder.findMany({
      where: { ...scope, status: SOLD, confirmedAt: range },
      select: { branchId: true, confirmedAt: true, totalAmount: true },
    }),
  ]);

  const index = new Map(days.map((day, position) => [day, position]));
  const byOutlet = new Map(outlets.map((outlet) => [outlet.id, days.map(() => 0)]));
  for (const order of orders) {
    const position = index.get(dayKey(order.confirmedAt));
    const values = byOutlet.get(order.branchId);
    if (position !== undefined && values) values[position] = Math.round((values[position] + Number(order.totalAmount)) * 100) / 100;
  }

  const series = outlets
    .map((outlet) => {
      const values = byOutlet.get(outlet.id);
      return { id: outlet.id, name: outlet.name, values, total: values.reduce((a, b) => a + b, 0) };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return { days, series: foldSeries(series) };
}

const ACTIVITY_WINDOW_MS = 48 * 60 * 60 * 1000;
const ACTIVITY_LIMIT = 15;

const staffName = (staff) => `${staff?.firstName ?? ""} ${staff?.lastName ?? ""}`.trim();

function orderEvents(order) {
  const base = {
    outlet: order.outlet?.name ?? null,
    reference: order.orderNumber,
    amount: Number(order.totalAmount),
    orderId: order.id,
    detail: `${order.totalItems} item${order.totalItems === 1 ? "" : "s"} · ${staffName(order.server) || "—"}`,
  };
  return [
    { ...base, type: "ORDER_PLACED", at: order.confirmedAt },
    order.completedAt && { ...base, type: "ORDER_COMPLETED", at: order.completedAt },
    order.cancelledAt && { ...base, type: "ORDER_CANCELLED", at: order.cancelledAt },
  ].filter(Boolean);
}

function shiftEvents(shift) {
  const base = { outlet: shift.outlet?.name ?? null, reference: staffName(shift.staff), detail: shift.staff?.badgeNumber ?? null };
  return [
    { ...base, type: "SHIFT_STARTED", at: shift.clockInAt },
    shift.clockOutAt && { ...base, type: "SHIFT_ENDED", at: shift.clockOutAt },
  ].filter(Boolean);
}

async function recentActivity(scope) {
  const since = new Date(Date.now() - ACTIVITY_WINDOW_MS);
  const [orders, shifts] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { ...scope, OR: [{ confirmedAt: { gte: since } }, { completedAt: { gte: since } }, { cancelledAt: { gte: since } }] },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        totalItems: true,
        confirmedAt: true,
        completedAt: true,
        cancelledAt: true,
        outlet: { select: { name: true } },
        server: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: ACTIVITY_LIMIT * 2,
    }),
    prisma.staffShift.findMany({
      where: { ...scope, OR: [{ clockInAt: { gte: since } }, { clockOutAt: { gte: since } }] },
      select: {
        clockInAt: true,
        clockOutAt: true,
        outlet: { select: { name: true } },
        staff: { select: { firstName: true, lastName: true, badgeNumber: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: ACTIVITY_LIMIT * 2,
    }),
  ]);

  return [...orders.flatMap(orderEvents), ...shifts.flatMap(shiftEvents)]
    .filter((event) => event.at >= since)
    .sort((a, b) => b.at - a.at)
    .slice(0, ACTIVITY_LIMIT);
}

async function outletFigures(scope) {
  const outletWhere = { parentId: scope.outlet.parentId, ...branch.withoutDeveloper };
  const [total, active, selling, lowStockOutlets] = await Promise.all([
    prisma.company.count({ where: outletWhere }),
    prisma.company.count({ where: { ...outletWhere, status: "ACTIVE" } }),
    prisma.salesOrder.groupBy({ by: ["branchId"], where: { ...scope, status: SOLD, confirmedAt: dayRange(0) } }),
    prisma.menuItemOutlet.groupBy({ by: ["branchId"], where: { ...scope, stock: { lte: LOW_STOCK_LIMIT } } }),
  ]);
  return { total, active, sellingToday: selling.length, lowStock: lowStockOutlets.length };
}

class Dashboard {
  async lowStock(req, res) {
    try {
      const branchId = await outletOf(req);
      if (!branchId) {
        return response.error(res, "Select an outlet to see its low stock items!", 422);
      }

      const list = branch.listParams(req.query);
      const where = {
        branchId,
        stock: { lte: LOW_STOCK_LIMIT },
        menuItem: branch.searchWhere(list.search, ["name", "description"]),
      };

      const [rows, total] = await prisma.$transaction([
        prisma.menuItemOutlet.findMany({
          where,
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                menuItemImage: true,
                menu: { select: { id: true, name: true } },
                menuItemPrices: { orderBy: { createdAt: "desc" }, take: 1 },
              },
            },
          },
          orderBy: [{ stock: "asc" }, { menuItem: { name: "asc" } }],
          skip: list.skip,
          take: list.take,
        }),
        prisma.menuItemOutlet.count({ where }),
      ]);

      const items = rows.map((row) => ({
        id: row.menuItem.id,
        name: row.menuItem.name,
        image: row.menuItem.menuItemImage,
        menu: row.menuItem.menu,
        stock: row.stock,
        price: branch.effectivePrice(row.menuItem.menuItemPrices?.[0], row.price),
        level: row.stock <= CRITICAL_STOCK_LIMIT ? "CRITICAL" : "LOW",
      }));

      return response.list(res, items, total, "Low Stock Items Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Dashboard");
    }
  }

  async company(req, res) {
    try {
      const scope = await companyScope(req);
      const [data, outlets] = await Promise.all([figures(scope), outletFigures(scope)]);
      return response.success(res, { ...data, outlets }, "Company Dashboard Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Dashboard");
    }
  }

  async companyOutlets(req, res) {
    try {
      const scope = await companyScope(req);
      return response.list(res, await outletBreakdown(scope), undefined, "Outlet Sales Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Dashboard");
    }
  }

  async companyTrend(req, res) {
    try {
      const scope = await companyScope(req);
      return response.success(res, await revenueTrend(scope), "Revenue Trend Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Dashboard");
    }
  }

  async companyActivity(req, res) {
    try {
      const scope = await companyScope(req);
      return response.list(res, await recentActivity(scope), undefined, "Recent Activity Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Dashboard");
    }
  }

  async outlet(req, res) {
    try {
      const branchId = await outletOf(req);
      if (!branchId) {
        return response.error(res, "Select an outlet to see its dashboard!", 422);
      }

      return response.success(res, await figures({ branchId }), "Outlet Dashboard Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Dashboard");
    }
  }
}

const dashboard = new Dashboard();
module.exports = dashboard;
