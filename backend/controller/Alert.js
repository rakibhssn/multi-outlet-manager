const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");
const { companyScope, dayRange } = require("./Dashboard");
const { threadRelations } = require("../helper/Reminder_Thread");

const { LOW_STOCK_LIMIT, CRITICAL_STOCK_LIMIT } = branch;
const SOLD = { in: ["CONFIRMED", "COMPLETED"] };
const DETAIL_LIMIT = 50;
const REMINDER_TYPES = ["REMINDER_OVERDUE", "REMINDER_ACCEPTED", "REMINDER_REPLY"];

const fail = (message, status = 422) => Object.assign(new Error(message), { status });

const MINUTE = 60 * 1000;
const LATE_ORDER_MINUTES = 30;
const LONG_SHIFT_HOURS = 12;
const LONG_BREAK_MINUTES = 60;
const NO_SALES_AFTER_HOUR = 12;
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

const minutesAgo = (minutes) => new Date(Date.now() - minutes * MINUTE);
const personOf = (staff) => `${staff.firstName} ${staff.lastName}`.trim();

function reminderCompany(scope) {
  const parentId = scope.outlet?.parentId;
  return typeof parentId === "string" ? { companyId: parentId } : {};
}

async function stockAlerts(scope, outletName) {
  const [critical, low] = await Promise.all([
    prisma.menuItemOutlet.groupBy({ by: ["branchId"], where: { ...scope, stock: { lte: CRITICAL_STOCK_LIMIT } }, _count: { _all: true } }),
    prisma.menuItemOutlet.groupBy({
      by: ["branchId"],
      where: { ...scope, stock: { gt: CRITICAL_STOCK_LIMIT, lte: LOW_STOCK_LIMIT } },
      _count: { _all: true },
    }),
  ]);
  return [
    ...critical.map((row) => ({
      type: "STOCK_CRITICAL",
      severity: "critical",
      outlet: outletName(row.branchId),
      title: `${row._count._all} item${row._count._all === 1 ? "" : "s"} critically low or out of stock`,
      detail: `${CRITICAL_STOCK_LIMIT} or fewer left`,
    })),
    ...low.map((row) => ({
      type: "STOCK_LOW",
      severity: "warning",
      outlet: outletName(row.branchId),
      title: `${row._count._all} item${row._count._all === 1 ? "" : "s"} running low`,
      detail: `${LOW_STOCK_LIMIT} or fewer left`,
    })),
  ];
}

async function orderAlerts(scope, outletName) {
  const [late, cancelled] = await Promise.all([
    prisma.salesOrder.groupBy({
      by: ["branchId"],
      where: { ...scope, status: "CONFIRMED", confirmedAt: { lt: minutesAgo(LATE_ORDER_MINUTES) } },
      _count: { _all: true },
      _min: { confirmedAt: true },
    }),
    prisma.salesOrder.groupBy({
      by: ["branchId"],
      where: { ...scope, status: "CANCELLED", cancelledAt: dayRange() },
      _count: { _all: true },
    }),
  ]);
  return [
    ...late.map((row) => ({
      type: "ORDER_LATE",
      severity: "warning",
      outlet: outletName(row.branchId),
      title: `${row._count._all} order${row._count._all === 1 ? "" : "s"} waiting over ${LATE_ORDER_MINUTES} minutes`,
      detail: "Confirmed but not completed",
      at: row._min.confirmedAt,
    })),
    ...cancelled.map((row) => ({
      type: "ORDER_CANCELLED",
      severity: "info",
      outlet: outletName(row.branchId),
      title: `${row._count._all} order${row._count._all === 1 ? "" : "s"} cancelled today`,
      detail: "Stock was restored",
    })),
  ];
}

async function staffAlerts(scope, outletName) {
  const staffSelect = { select: { firstName: true, lastName: true } };
  const [shifts, breaks] = await Promise.all([
    prisma.staffShift.findMany({
      where: { ...scope, status: "ON_SHIFT", clockInAt: { lt: minutesAgo(LONG_SHIFT_HOURS * 60) } },
      select: { branchId: true, clockInAt: true, staff: staffSelect },
    }),
    prisma.staffShiftBreak.findMany({
      where: { endAt: null, startAt: { lt: minutesAgo(LONG_BREAK_MINUTES) }, shift: { ...scope, status: "ON_SHIFT" } },
      select: { startAt: true, shift: { select: { branchId: true, staff: staffSelect } } },
    }),
  ]);
  return [
    ...shifts.map((shift) => ({
      type: "SHIFT_LONG",
      severity: "warning",
      outlet: outletName(shift.branchId),
      title: `${personOf(shift.staff)} on shift for over ${LONG_SHIFT_HOURS} hours`,
      detail: "Possibly forgot to clock out",
      at: shift.clockInAt,
    })),
    ...breaks.map((item) => ({
      type: "BREAK_LONG",
      severity: "info",
      outlet: outletName(item.shift.branchId),
      title: `${personOf(item.shift.staff)} on break for over ${LONG_BREAK_MINUTES} minutes`,
      detail: "Break has not ended",
      at: item.startAt,
    })),
  ];
}

async function reminderAlerts(scope) {
  const company = reminderCompany(scope);
  const [overdue, replies] = await Promise.all([
    prisma.reminder.findMany({
      where: { ...company, status: "OPEN", dueAt: { lt: new Date() } },
      select: { id: true, title: true, dueAt: true, acceptedAt: true, outlet: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
      take: 10,
    }),
    prisma.reminderReply.findMany({
      where: { createdAt: { gte: minutesAgo(24 * 60) }, reminder: company },
      select: {
        accepted: true,
        message: true,
        createdAt: true,
        reminder: { select: { id: true, title: true } },
        author: { select: { company: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  return [
    ...overdue.map((reminder) => ({
      type: "REMINDER_OVERDUE",
      severity: reminder.acceptedAt ? "warning" : "critical",
      outlet: reminder.outlet,
      title: `Overdue: ${reminder.title}`,
      detail: reminder.acceptedAt ? "Accepted, not done yet" : "Not accepted yet",
      at: reminder.dueAt,
      ref: reminder.id,
    })),
    ...replies.map((reply) => ({
      type: reply.accepted ? "REMINDER_ACCEPTED" : "REMINDER_REPLY",
      severity: "info",
      outlet: reply.author?.company ?? null,
      title: `${reply.accepted ? "Accepted" : "Replied to"}: ${reply.reminder.title}`,
      detail: reply.message ?? "",
      at: reply.createdAt,
      ref: reply.reminder.id,
    })),
  ];
}

async function salesAlerts(scope, outlets) {
  if (new Date().getHours() < NO_SALES_AFTER_HOUR) return [];
  const selling = await prisma.salesOrder.groupBy({
    by: ["branchId"],
    where: { ...scope, status: SOLD, confirmedAt: dayRange() },
  });
  const sold = new Set(selling.map((row) => row.branchId));
  return outlets
    .filter((outlet) => outlet.status === "ACTIVE" && !sold.has(outlet.id))
    .map((outlet) => ({
      type: "NO_SALES",
      severity: "info",
      outlet: { id: outlet.id, name: outlet.name },
      title: "No sales yet today",
      detail: "The outlet is active but has not sold anything",
    }));
}

async function companyAlerts(scope) {
  const outlets = await prisma.company.findMany({
    where: { parentId: scope.outlet.parentId },
    select: { id: true, name: true, status: true },
  });
  const byId = new Map(outlets.map((outlet) => [outlet.id, { id: outlet.id, name: outlet.name }]));
  const outletName = (id) => byId.get(id) ?? { id, name: "Outlet" };
  const sources = {
    stock: stockAlerts(scope, outletName),
    orders: orderAlerts(scope, outletName),
    staff: staffAlerts(scope, outletName),
    reminders: reminderAlerts(scope),
    sales: salesAlerts(scope, outlets),
  };
  const results = await Promise.allSettled(Object.values(sources));
  const failed = [];
  const groups = results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const source = Object.keys(sources)[index];
    failed.push(source);
    console.error(`Alert source "${source}" failed:`, result.reason);
    return [];
  });
  const alerts = groups.flat().sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const summary = Object.fromEntries(Object.keys(SEVERITY_ORDER).map((key) => [key, 0]));
  alerts.forEach((alert) => (summary[alert.severity] += 1));
  return { alerts, summary, failed };
}


const orderSelect = {
  id: true,
  orderNumber: true,
  orderType: true,
  tableNumber: true,
  totalItems: true,
  totalAmount: true,
  status: true,
  confirmedAt: true,
  cancelledAt: true,
  server: { select: { firstName: true, lastName: true } },
};

const staffSelect = { select: { id: true, firstName: true, lastName: true, badgeNumber: true, designation: true } };

async function outletInScope(scope, outletId) {
  const outlet = outletId
    ? await prisma.company.findFirst({
        where: { id: outletId, parentId: scope.outlet.parentId },
        select: { id: true, name: true, status: true, contactPersonName: true, contactPersonPhone: true },
      })
    : null;
  if (!outlet) throw fail("Outlet Not Found!", 404);
  return outlet;
}

async function stockRows(branchId, stock) {
  const rows = await prisma.menuItemOutlet.findMany({
    where: { branchId, stock },
    include: {
      menuItem: {
        select: {
          id: true,
          name: true,
          menuItemImage: true,
          menu: { select: { name: true } },
          menuItemPrices: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: [{ stock: "asc" }, { menuItem: { name: "asc" } }],
    take: DETAIL_LIMIT,
  });
  return rows.map((row) => ({
    id: row.menuItem.id,
    name: row.menuItem.name,
    image: row.menuItem.menuItemImage,
    menu: row.menuItem.menu?.name ?? null,
    stock: row.stock,
    price: branch.effectivePrice(row.menuItem.menuItemPrices?.[0], row.price),
    level: row.stock <= CRITICAL_STOCK_LIMIT ? "CRITICAL" : "LOW",
  }));
}

function ordersWhere(branchId, where) {
  return prisma.salesOrder.findMany({ where: { branchId, ...where }, select: orderSelect, orderBy: { confirmedAt: "asc" }, take: DETAIL_LIMIT });
}

async function outletStatus(outlet) {
  const [lastSale, today, onShift, stocked, outOfStock] = await Promise.all([
    prisma.salesOrder.findFirst({
      where: { branchId: outlet.id, status: SOLD },
      orderBy: { confirmedAt: "desc" },
      select: orderSelect,
    }),
    prisma.salesOrder.groupBy({ by: ["status"], where: { branchId: outlet.id, confirmedAt: dayRange() }, _count: { _all: true } }),
    prisma.staffShift.findMany({
      where: { branchId: outlet.id, status: "ON_SHIFT" },
      select: { clockInAt: true, staff: staffSelect },
      orderBy: { clockInAt: "asc" },
    }),
    prisma.menuItemOutlet.count({ where: { branchId: outlet.id, stock: { gt: 0 } } }),
    prisma.menuItemOutlet.count({ where: { branchId: outlet.id, stock: { lte: 0 } } }),
  ]);
  return {
    lastSale,
    ordersToday: Object.fromEntries(today.map((row) => [row.status, row._count._all])),
    onShift,
    stock: { stocked, outOfStock },
  };
}

const OUTLET_DETAILS = {
  STOCK_CRITICAL: (outlet) => stockRows(outlet.id, { lte: CRITICAL_STOCK_LIMIT }),
  STOCK_LOW: (outlet) => stockRows(outlet.id, { gt: CRITICAL_STOCK_LIMIT, lte: LOW_STOCK_LIMIT }),
  ORDER_LATE: (outlet) => ordersWhere(outlet.id, { status: "CONFIRMED", confirmedAt: { lt: minutesAgo(LATE_ORDER_MINUTES) } }),
  ORDER_CANCELLED: (outlet) => ordersWhere(outlet.id, { status: "CANCELLED", cancelledAt: dayRange() }),
  SHIFT_LONG: (outlet) =>
    prisma.staffShift.findMany({
      where: { branchId: outlet.id, status: "ON_SHIFT", clockInAt: { lt: minutesAgo(LONG_SHIFT_HOURS * 60) } },
      select: { id: true, clockInAt: true, note: true, staff: staffSelect, startedBy: { select: { email: true } } },
      orderBy: { clockInAt: "asc" },
    }),
  BREAK_LONG: (outlet) =>
    prisma.staffShiftBreak.findMany({
      where: { endAt: null, startAt: { lt: minutesAgo(LONG_BREAK_MINUTES) }, shift: { branchId: outlet.id, status: "ON_SHIFT" } },
      select: { id: true, startAt: true, shift: { select: { clockInAt: true, staff: staffSelect } } },
      orderBy: { startAt: "asc" },
    }),
  NO_SALES: (outlet) => outletStatus(outlet),
};

async function reminderDetail(scope, id) {
  const reminder = id
    ? await prisma.reminder.findFirst({
        where: { id, ...reminderCompany(scope) },
        include: {
          outlet: { select: { id: true, name: true } },
          staff: staffSelect,
          createdBy: { select: { id: true, email: true } },
          ...threadRelations,
        },
      })
    : null;
  if (!reminder) throw fail("Reminder Not Found!", 404);
  return reminder;
}

async function alertDetail(scope, type, query) {
  if (REMINDER_TYPES.includes(type)) {
    const reminder = await reminderDetail(scope, query.ref);
    return { type, outlet: reminder.outlet, data: reminder };
  }
  const load = OUTLET_DETAILS[type];
  if (!load) throw fail("Unknown alert type!");
  const outlet = await outletInScope(scope, query.outletId);
  return { type, outlet, data: await load(outlet) };
}

class Alert {
  async list(req, res) {
    try {
      const scope = await companyScope(req);
      const { alerts, summary, failed } = await companyAlerts(scope);
      return res
        .status(200)
        .json({ status: "success", message: "Alerts Fetched Successfully", data: alerts, summary, failed });
    } catch (error) {
      return branch.handleError(res, error, "Alert");
    }
  }

  async details(req, res) {
    try {
      const scope = await companyScope(req);
      return response.success(res, await alertDetail(scope, req.params.type, req.query), "Alert Details Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Alert");
    }
  }
}

const alert = new Alert();
module.exports = alert;
