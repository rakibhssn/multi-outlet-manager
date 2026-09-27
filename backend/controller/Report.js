const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");

const SOLD = { in: ["CONFIRMED", "COMPLETED"] };
const { LOW_STOCK_LIMIT, CRITICAL_STOCK_LIMIT } = branch;
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const outletSelect = {
  id: true,
  name: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  contactPersonPhone: true,
  parentId: true,
  parent: { select: { id: true, name: true } },
};

const fail = (message, status) => Object.assign(new Error(message), { status });

const round = (value) => Math.round(value * 100) / 100;

const pad = (value) => String(value).padStart(2, "0");

const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const minutesBetween = (start, end) => Math.max(Math.round(((end ?? new Date()) - start) / 60000), 0);

const fullName = (staff) => `${staff?.firstName ?? ""} ${staff?.lastName ?? ""}`.trim();

const humanize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function parseDay(value, fallback) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return fallback;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function periodOf(query) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = parseDay(query.to, today);
  const from = parseDay(query.from, new Date(to.getTime() - 6 * DAY_MS));
  if (from > to) throw fail("The start date must be before the end date!", 422);
  const end = new Date(to);
  end.setDate(end.getDate() + 1);
  if ((end - from) / DAY_MS > MAX_RANGE_DAYS) throw fail("A report can cover at most one year!", 422);
  return { from: dayKey(from), to: dayKey(to), range: { gte: from, lt: end } };
}

const companySelect = {
  id: true,
  name: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  contactPersonPhone: true,
};

async function viewerCompany(req) {
  if (req.user?.accountType === "DEVELOPER") return req.query.companyId || null;
  const viewer = await prisma.user.findUnique({ where: { id: req.user?.userId }, select: { branchId: true } });
  if (!viewer?.branchId) throw fail("Unauthorized Access!", 401);
  return viewer.branchId;
}

async function singleOutlet(req, branchId, own) {
  const outlet = await prisma.company.findFirst({
    where: { id: branchId, parentId: { not: null } },
    select: outletSelect,
  });
  if (!outlet) throw fail("Outlet Not Found!", 404);
  if (!own && req.user?.accountType === "HEADQUARTER" && (await viewerCompany(req)) !== outlet.parentId) {
    throw fail("You can only see reports of your own outlets!", 403);
  }
  return { scope: { branchId: outlet.id }, outlet, all: false, companyId: outlet.parentId };
}

async function allOutlets(req) {
  const companyId = await viewerCompany(req);
  const company = companyId
    ? await prisma.company.findFirst({ where: { id: companyId, parentId: null }, select: companySelect })
    : null;
  if (companyId && !company) throw fail("Company Not Found!", 404);
  return {
    scope: { outlet: companyId ? { parentId: companyId } : { parentId: { not: null } } },
    outlet: { ...company, id: "all", name: "All Outlets", parent: { name: company?.name ?? "All Companies" } },
    all: true,
    companyId,
  };
}

async function targetFor(req) {
  const own = await branch.viewerOutlet(req.user);
  if (own) return singleOutlet(req, own, true);
  if (!["HEADQUARTER", "DEVELOPER"].includes(req.user?.accountType)) throw fail("Unauthorized Access!", 403);
  const requested = req.query.branchId;
  return requested && requested !== "all" ? singleOutlet(req, requested, false) : allOutlets(req);
}

const STAFF_REPORTS = ["servers", "shifts", "attendance"];

async function staffFilter(req, target) {
  const staffId = STAFF_REPORTS.includes(req.params.type) ? req.query.staffId : null;
  if (!staffId) return null;
  const staff = await prisma.staff.findFirst({
    where: { id: String(staffId), ...(target.companyId ? { outlet: { parentId: target.companyId } } : {}) },
    select: { id: true, firstName: true, lastName: true, badgeNumber: true },
  });
  if (!staff) throw fail("Staff Not Found!", 404);
  return staff;
}

const staffWhere = (target, key) => (target.staff ? { [key]: target.staff.id } : {});

const OUTLET_COLUMN = { key: "outlet", title: "Outlet", type: "text" };

function withOutletColumn(report, target) {
  if (!target.all || !report.rows.some((row) => "outlet" in row)) return report;
  const columns = [...report.columns];
  columns.splice(1, 0, OUTLET_COLUMN);
  return { ...report, columns, totals: report.totals ? { ...report.totals, outlet: "" } : report.totals };
}

function daysOf(period) {
  const days = [];
  for (let day = new Date(period.range.gte); day < period.range.lt; day.setDate(day.getDate() + 1)) {
    days.push(dayKey(day));
  }
  return days;
}

async function salesSummary(target, period) {
  const orders = await prisma.salesOrder.findMany({
    where: { ...target.scope, confirmedAt: period.range },
    select: { confirmedAt: true, status: true, totalAmount: true, totalItems: true, orderType: true },
  });
  const sold = orders.filter((order) => order.status !== "CANCELLED");

  const byDay = new Map(daysOf(period).map((day) => [day, { orders: 0, items: 0, revenue: 0, cancelled: 0 }]));
  for (const order of orders) {
    const bucket = byDay.get(dayKey(order.confirmedAt));
    if (!bucket) continue;
    if (order.status === "CANCELLED") {
      bucket.cancelled += 1;
      continue;
    }
    bucket.orders += 1;
    bucket.items += order.totalItems;
    bucket.revenue += Number(order.totalAmount);
  }

  const rows = [...byDay].map(([date, day]) => ({
    date,
    orders: day.orders,
    items: day.items,
    revenue: round(day.revenue),
    average: day.orders ? round(day.revenue / day.orders) : 0,
    cancelled: day.cancelled,
  }));

  const revenue = round(sold.reduce((sum, order) => sum + Number(order.totalAmount), 0));
  const items = sold.reduce((sum, order) => sum + order.totalItems, 0);
  const typeTotals = ["DINE_IN", "TAKEAWAY", "DELIVERY"].map((type) => ({
    label: humanize(type),
    value: round(sold.filter((order) => order.orderType === type).reduce((sum, order) => sum + Number(order.totalAmount), 0)),
    type: "money",
  }));

  return {
    title: "Sales Summary",
    summary: [
      { label: "Revenue", value: revenue, type: "money" },
      { label: "Orders", value: sold.length, type: "number" },
      { label: "Items Sold", value: items, type: "number" },
      { label: "Average Order", value: sold.length ? round(revenue / sold.length) : 0, type: "money" },
      { label: "Cancelled Orders", value: orders.length - sold.length, type: "number" },
      ...typeTotals,
    ],
    columns: [
      { key: "date", title: "Date", type: "date" },
      { key: "orders", title: "Orders", type: "number" },
      { key: "items", title: "Items", type: "number" },
      { key: "revenue", title: "Revenue", type: "money" },
      { key: "average", title: "Avg. Order", type: "money" },
      { key: "cancelled", title: "Cancelled", type: "number" },
    ],
    rows,
    totals: {
      date: "Total",
      orders: sold.length,
      items,
      revenue,
      average: sold.length ? round(revenue / sold.length) : 0,
      cancelled: orders.length - sold.length,
    },
  };
}

async function itemSales(target, period) {
  const groups = await prisma.salesOrderItem.groupBy({
    by: ["menuItemId", "itemName"],
    where: { salesOrder: { ...target.scope, status: SOLD, confirmedAt: period.range } },
    _sum: { quantity: true, lineTotal: true },
  });
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: groups.map((group) => group.menuItemId) } },
    select: { id: true, menu: { select: { name: true } } },
  });
  const menuOf = new Map(menuItems.map((item) => [item.id, item.menu?.name ?? "—"]));
  const revenue = round(groups.reduce((sum, group) => sum + Number(group._sum.lineTotal ?? 0), 0));
  const quantity = groups.reduce((sum, group) => sum + (group._sum.quantity ?? 0), 0);

  const rows = groups
    .map((group) => {
      const lineRevenue = round(Number(group._sum.lineTotal ?? 0));
      const sold = group._sum.quantity ?? 0;
      return {
        item: group.itemName,
        menu: menuOf.get(group.menuItemId) ?? "—",
        quantity: sold,
        average: sold ? round(lineRevenue / sold) : 0,
        revenue: lineRevenue,
        share: revenue ? round((lineRevenue / revenue) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    title: "Item Sales",
    summary: [
      { label: "Revenue", value: revenue, type: "money" },
      { label: "Items Sold", value: quantity, type: "number" },
      { label: "Different Items", value: rows.length, type: "number" },
      { label: "Top Item", value: rows[0]?.item ?? "—", type: "text" },
    ],
    columns: [
      { key: "item", title: "Item", type: "text" },
      { key: "menu", title: "Menu", type: "text" },
      { key: "quantity", title: "Qty Sold", type: "number" },
      { key: "average", title: "Avg. Price", type: "money" },
      { key: "revenue", title: "Revenue", type: "money" },
      { key: "share", title: "Share", type: "percent" },
    ],
    rows,
    totals: { item: "Total", menu: "", quantity, average: "", revenue, share: rows.length ? 100 : 0 },
  };
}

async function serverPerformance(target, period) {
  const groups = await prisma.salesOrder.groupBy({
    by: ["serverId"],
    where: { ...target.scope, ...staffWhere(target, "serverId"), status: SOLD, confirmedAt: period.range },
    _count: { _all: true },
    _sum: { totalAmount: true, totalItems: true },
  });
  const staffs = await prisma.staff.findMany({
    where: { id: { in: groups.map((group) => group.serverId) } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      badgeNumber: true,
      designation: true,
      outlet: { select: { name: true } },
    },
  });
  const staffOf = new Map(staffs.map((staff) => [staff.id, staff]));

  const rows = groups
    .map((group) => {
      const staff = staffOf.get(group.serverId);
      const revenue = round(Number(group._sum.totalAmount ?? 0));
      return {
        server: fullName(staff) || "—",
        outlet: staff?.outlet?.name ?? "—",
        badge: staff?.badgeNumber ?? "—",
        designation: humanize(staff?.designation),
        orders: group._count._all,
        items: group._sum.totalItems ?? 0,
        revenue,
        average: group._count._all ? round(revenue / group._count._all) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const orders = rows.reduce((sum, row) => sum + row.orders, 0);
  const revenue = round(rows.reduce((sum, row) => sum + row.revenue, 0));

  return {
    title: "Server Performance",
    summary: [
      { label: "Revenue", value: revenue, type: "money" },
      { label: "Orders", value: orders, type: "number" },
      { label: "Servers", value: rows.length, type: "number" },
      { label: "Top Server", value: rows[0]?.server ?? "—", type: "text" },
    ],
    columns: [
      { key: "server", title: "Server", type: "text" },
      { key: "badge", title: "Badge", type: "text" },
      { key: "designation", title: "Designation", type: "text" },
      { key: "orders", title: "Orders", type: "number" },
      { key: "items", title: "Items", type: "number" },
      { key: "revenue", title: "Revenue", type: "money" },
      { key: "average", title: "Avg. Order", type: "money" },
    ],
    rows,
    totals: {
      server: "Total",
      badge: "",
      designation: "",
      orders,
      items: rows.reduce((sum, row) => sum + row.items, 0),
      revenue,
      average: orders ? round(revenue / orders) : 0,
    },
  };
}

function stockLevel(stock) {
  if (stock <= 0) return "Out of stock";
  if (stock <= CRITICAL_STOCK_LIMIT) return "Critical";
  if (stock <= LOW_STOCK_LIMIT) return "Low";
  return "In stock";
}

async function stockReport(target) {
  const assigned = await prisma.menuItemOutlet.findMany({
    where: target.scope,
    include: {
      outlet: { select: { name: true } },
      menuItem: {
        select: {
          name: true,
          status: true,
          menu: { select: { name: true } },
          menuItemPrices: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: [{ stock: "asc" }, { menuItem: { name: "asc" } }],
  });

  const rows = assigned.map((row) => {
    const price = branch.effectivePrice(row.menuItem.menuItemPrices?.[0], row.price) ?? 0;
    return {
      item: row.menuItem.name,
      outlet: row.outlet?.name ?? "—",
      menu: row.menuItem.menu?.name ?? "—",
      price,
      stock: row.stock,
      value: round(price * row.stock),
      level: stockLevel(row.stock),
    };
  });

  const count = (level) => rows.filter((row) => row.level === level).length;
  const value = round(rows.reduce((sum, row) => sum + row.value, 0));
  const units = rows.reduce((sum, row) => sum + row.stock, 0);

  return {
    title: "Stock Report",
    summary: [
      { label: "Stock Value", value, type: "money" },
      { label: "Units In Stock", value: units, type: "number" },
      { label: "Items Assigned", value: rows.length, type: "number" },
      { label: "Low", value: count("Low"), type: "number" },
      { label: "Critical", value: count("Critical"), type: "number" },
      { label: "Out of Stock", value: count("Out of stock"), type: "number" },
    ],
    columns: [
      { key: "item", title: "Item", type: "text" },
      { key: "menu", title: "Menu", type: "text" },
      { key: "price", title: "Price", type: "money" },
      { key: "stock", title: "Stock", type: "number" },
      { key: "value", title: "Stock Value", type: "money" },
      { key: "level", title: "Level", type: "level" },
    ],
    rows,
    totals: { item: "Total", menu: "", price: "", stock: units, value, level: "" },
    live: true,
  };
}

function attendanceRows(shifts) {
  const byStaff = new Map();
  for (const shift of shifts) {
    const row = byStaff.get(shift.staffId) ?? {
      staff: fullName(shift.staff),
      outlet: shift.outlet?.name ?? "—",
      badge: shift.staff?.badgeNumber ?? "—",
      designation: humanize(shift.staff?.designation),
      shifts: 0,
      workedMinutes: 0,
    };
    const breakMinutes = shift.breaks.reduce((sum, item) => sum + minutesBetween(item.startAt, item.endAt), 0);
    row.shifts += 1;
    row.workedMinutes += Math.max(minutesBetween(shift.clockInAt, shift.clockOutAt) - breakMinutes, 0);
    byStaff.set(shift.staffId, row);
  }
  return [...byStaff.values()]
    .map((row) => ({ ...row, averageMinutes: row.shifts ? Math.round(row.workedMinutes / row.shifts) : 0 }))
    .sort((a, b) => b.workedMinutes - a.workedMinutes);
}

async function staffAttendance(target, period) {
  const shifts = await prisma.staffShift.findMany({
    where: { ...target.scope, ...staffWhere(target, "staffId"), clockInAt: period.range },
    include: {
      staff: { select: { firstName: true, lastName: true, badgeNumber: true, designation: true } },
      outlet: { select: { name: true } },
      breaks: { select: { startAt: true, endAt: true } },
    },
  });
  const rows = attendanceRows(shifts);
  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  const worked = sum("workedMinutes");

  return {
    title: "Staff Attendance",
    summary: [
      { label: "Hours Worked", value: worked, type: "minutes" },
      { label: "Shifts", value: shifts.length, type: "number" },
      { label: "Staff Worked", value: rows.length, type: "number" },
      { label: "Still On Shift", value: shifts.filter((shift) => shift.status === "ON_SHIFT").length, type: "number" },
    ],
    columns: [
      { key: "staff", title: "Staff", type: "text" },
      { key: "badge", title: "Badge", type: "text" },
      { key: "designation", title: "Designation", type: "text" },
      { key: "shifts", title: "Shifts", type: "number" },
      { key: "workedMinutes", title: "Worked", type: "minutes" },
      { key: "averageMinutes", title: "Avg. Shift", type: "minutes" },
    ],
    rows,
    totals: {
      staff: "Total",
      badge: "",
      designation: "",
      shifts: shifts.length,
      workedMinutes: worked,
      averageMinutes: shifts.length ? Math.round(worked / shifts.length) : 0,
    },
  };
}

function shiftRow(shift) {
  const breakMinutes = shift.breaks.reduce((sum, item) => sum + minutesBetween(item.startAt, item.endAt), 0);
  return {
    date: dayKey(shift.clockInAt),
    staff: fullName(shift.staff),
    outlet: shift.outlet?.name ?? "—",
    badge: shift.staff?.badgeNumber ?? "—",
    clockIn: shift.clockInAt,
    clockOut: shift.clockOutAt ?? "On shift",
    workedMinutes: Math.max(minutesBetween(shift.clockInAt, shift.clockOutAt) - breakMinutes, 0),
    status: humanize(shift.status),
  };
}

async function shiftLog(target, period) {
  const shifts = await prisma.staffShift.findMany({
    where: { ...target.scope, ...staffWhere(target, "staffId"), clockInAt: period.range },
    include: {
      staff: { select: { firstName: true, lastName: true, badgeNumber: true } },
      outlet: { select: { name: true } },
      breaks: { select: { startAt: true, endAt: true } },
    },
    orderBy: { clockInAt: "asc" },
  });
  const rows = shifts.map(shiftRow);
  const sum = (key) => rows.reduce((total, row) => total + row[key], 0);
  const worked = sum("workedMinutes");

  return {
    title: "Staff Shifts",
    summary: [
      { label: "Shifts", value: rows.length, type: "number" },
      { label: "Hours Worked", value: worked, type: "minutes" },
      { label: "Average Shift", value: rows.length ? Math.round(worked / rows.length) : 0, type: "minutes" },
      { label: "Still On Shift", value: shifts.filter((shift) => shift.status === "ON_SHIFT").length, type: "number" },
    ],
    columns: [
      { key: "date", title: "Date", type: "date" },
      { key: "staff", title: "Staff", type: "text" },
      { key: "badge", title: "Badge", type: "text" },
      { key: "clockIn", title: "Clock In", type: "time" },
      { key: "clockOut", title: "Clock Out", type: "time" },
      { key: "workedMinutes", title: "Worked", type: "minutes" },
      { key: "status", title: "Status", type: "text" },
    ],
    rows,
    totals: {
      date: "Total",
      staff: "",
      badge: "",
      clockIn: "",
      clockOut: "",
      workedMinutes: worked,
      status: "",
    },
  };
}

const REPORTS = {
  sales: salesSummary,
  items: itemSales,
  servers: serverPerformance,
  stock: stockReport,
  attendance: staffAttendance,
  shifts: shiftLog,
};

class Report {
  async generate(req, res) {
    try {
      const build = REPORTS[req.params.type];
      if (!build) {
        return response.notFoundError(res, "Report Not Found!");
      }

      const outletTarget = await targetFor(req);
      const target = { ...outletTarget, staff: await staffFilter(req, outletTarget) };
      const period = periodOf(req.query);
      const report = withOutletColumn(await build(target, period), target);

      return response.success(
        res,
        {
          ...report,
          type: req.params.type,
          outlet: target.outlet,
          allOutlets: target.all,
          staff: target.staff ? { ...target.staff, name: fullName(target.staff) } : null,
          period: report.live ? null : { from: period.from, to: period.to },
          generatedAt: new Date(),
        },
        `${report.title} Generated Successfully`,
      );
    } catch (error) {
      return branch.handleError(res, error, "Report");
    }
  }
}

const report = new Report();
module.exports = report;
