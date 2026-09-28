const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");
const { can } = require("../helper/Permissions");

const SHIFT_STATUSES = ["ON_SHIFT", "COMPLETED"];
const STAFF_SEARCH_FIELDS = ["firstName", "lastName", "badgeNumber"];

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  badgeNumber: true,
  designation: true,
  branchId: true,
  status: true,
};

const shiftInclude = {
  staff: { select: staffSelect },
  outlet: { select: { id: true, name: true } },
  startedBy: { select: { id: true, email: true } },
  endedBy: { select: { id: true, email: true } },
  breaks: {
    orderBy: { startAt: "asc" },
    select: { id: true, startAt: true, endAt: true, note: true },
  },
};

const fail = (message, status) => Object.assign(new Error(message), { status });

const OUTLET_ACCOUNTS = ["OUTLET", "OUTLET_STAFF"];

function loadViewer(viewer) {
  if (!viewer?.userId) throw fail("Authentication Required!", 401);
  return { ...viewer, id: viewer.userId };
}

function targetStaffId(user, requestedId) {
  const staffId = requestedId && requestedId !== user.staffId ? requestedId : user.staffId;
  if (!staffId) throw fail("Select the staff for this shift!", 422);
  const permission = staffId === user.staffId ? "shifts.self" : "shifts.manage";
  if (!can(user, permission)) throw fail("You do not have access to this action", 403);
  return staffId;
}

async function resolveStaff(user, requestedId) {
  const staff = await prisma.staff.findUnique({ where: { id: targetStaffId(user, requestedId) }, select: staffSelect });
  if (!staff) throw fail("Staff Not Found!", 404);
  if (OUTLET_ACCOUNTS.includes(user.accountType) && staff.branchId !== user.branchId) {
    throw fail("You can only manage shifts of your own outlet!", 403);
  }
  return staff;
}

function openShiftOf(staffId) {
  return prisma.staffShift.findFirst({
    where: { staffId, status: "ON_SHIFT" },
    orderBy: { clockInAt: "desc" },
    include: shiftInclude,
  });
}

async function closeOpenShifts(tx, staffId, { endedById = null, note = null } = {}) {
  const now = new Date();
  await tx.staffShiftBreak.updateMany({
    where: { endAt: null, shift: { staffId, status: "ON_SHIFT" } },
    data: { endAt: now, endedById },
  });
  return tx.staffShift.updateMany({
    where: { staffId, status: "ON_SHIFT" },
    data: { status: "COMPLETED", clockOutAt: now, endedById, ...(note ? { note } : {}) },
  });
}

const cleanNote = (note) => (note ? String(note).trim().slice(0, 255) : null);

const MAX_SHIFT_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

function dayOf(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

function readDate(value, label) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw fail(`${label} is not a valid date and time!`, 422);
  if (date - Date.now() > CLOCK_SKEW_MS) throw fail(`${label} cannot be in the future!`, 422);
  return date;
}

async function checkOneShiftPerDay(tx, staff, clockInAt, exceptId) {
  const taken = await tx.staffShift.findFirst({
    where: { staffId: staff.id, clockInAt: dayOf(clockInAt), ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (taken) throw fail(`${staff.firstName} ${staff.lastName} already has a shift on this day!`, 409);
}

function readShiftTimes(body, shift) {
  const clockInAt = readDate(body.clockInAt, "Clock in");
  const clockOutAt = body.clockOutAt ? readDate(body.clockOutAt, "Clock out") : null;
  if (!clockOutAt && shift.status !== "ON_SHIFT") throw fail("A completed shift needs a clock out time!", 422);
  if (clockOutAt && clockOutAt <= clockInAt) throw fail("Clock out must be after clock in!", 422);
  if ((clockOutAt ?? new Date()) - clockInAt > MAX_SHIFT_MS) throw fail("A shift cannot be longer than 24 hours!", 422);
  return { clockInAt, clockOutAt };
}

function readBreaks(list, { clockInAt, clockOutAt }) {
  const shiftEnd = clockOutAt ?? new Date();
  const breaks = (Array.isArray(list) ? list : [])
    .map((item, index) => ({
      id: typeof item?.id === "string" ? item.id : null,
      startAt: readDate(item?.startAt, `Break ${index + 1} start`),
      endAt: item?.endAt ? readDate(item.endAt, `Break ${index + 1} end`) : null,
    }))
    .sort((a, b) => a.startAt - b.startAt);

  breaks.forEach((item, index) => {
    const label = `Break ${index + 1}`;
    const last = index === breaks.length - 1;
    if (item.startAt < clockInAt || item.startAt >= shiftEnd) throw fail(`${label} must start during the shift!`, 422);
    if (!item.endAt && (clockOutAt || !last)) throw fail(`${label} needs an end time!`, 422);
    if (item.endAt && (item.endAt <= item.startAt || item.endAt > shiftEnd)) {
      throw fail(`${label} must end after it starts and before the shift ends!`, 422);
    }
    const next = breaks[index + 1];
    if (next && item.endAt > next.startAt) throw fail(`${label} overlaps the next break!`, 422);
  });
  return breaks;
}

async function saveBreaks(tx, shift, breaks, userId) {
  const keep = breaks.filter((item) => item.id && shift.breaks.some((current) => current.id === item.id));
  await tx.staffShiftBreak.deleteMany({
    where: { shiftId: shift.id, id: { notIn: keep.map((item) => item.id) } },
  });
  for (const item of breaks) {
    const data = { startAt: item.startAt, endAt: item.endAt };
    if (keep.includes(item)) {
      await tx.staffShiftBreak.update({ where: { id: item.id }, data });
    } else {
      await tx.staffShiftBreak.create({
        data: { ...data, shiftId: shift.id, startedById: userId, endedById: item.endAt ? userId : null },
      });
    }
  }
}

function inViewerScope(user, shift) {
  if (OUTLET_ACCOUNTS.includes(user.accountType)) return shift.branchId === user.branchId;
  if (user.accountType === "HEADQUARTER") return shift.outlet?.parentId === user.branchId;
  return user.accountType === "DEVELOPER";
}

async function findShift(user, id) {
  const shift = await prisma.staffShift.findUnique({
    where: { id },
    include: { ...shiftInclude, outlet: { select: { id: true, name: true, parentId: true } } },
  });
  if (!shift || !inViewerScope(user, shift)) throw fail("Shift Not Found!", 404);
  return shift;
}

async function requireOpenShift(req) {
  const user = loadViewer(req.user);
  const staff = await resolveStaff(user, req.body?.staffId);
  const shift = await openShiftOf(staff.id);
  if (!shift) throw fail(`${staff.firstName} ${staff.lastName} is not on shift!`, 422);
  return { user, staff, shift };
}

function staffScope(user, requestedId) {
  if (can(user, "shifts.manage")) return requestedId ? { staffId: requestedId } : {};
  return { staffId: user.staffId ?? "" };
}

function dateRange(from, to) {
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  const range = {
    ...(start && !Number.isNaN(start.getTime()) ? { gte: start } : {}),
    ...(end && !Number.isNaN(end.getTime()) ? { lte: end } : {}),
  };
  return Object.keys(range).length ? { clockInAt: range } : {};
}

class Shift {
  async me(req, res) {
    try {
      const user = loadViewer(req.user);
      if (!user.staffId) {
        return response.success(res, { staff: null, shift: null }, "No Staff Profile For This Account");
      }

      const [staff, shift] = await Promise.all([
        prisma.staff.findUnique({ where: { id: user.staffId }, select: staffSelect }),
        openShiftOf(user.staffId),
      ]);

      return response.success(res, { staff, shift }, "Shift Status Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Shift");
    }
  }

  async list(req, res) {
    try {
      const user = loadViewer(req.user);
      const list = branch.listParams(req.query, {
        sortable: ["clockInAt", "clockOutAt", "status", "createdAt"],
        sortBy: "clockInAt",
      });
      const branchId = (await branch.viewerOutlet(req.user)) ?? req.query.branchId;
      const staffSearch = branch.searchWhere(list.search, STAFF_SEARCH_FIELDS);

      const where = {
        ...(branchId ? { branchId } : {}),
        ...(req.query.companyId ? { outlet: { parentId: req.query.companyId } } : {}),
        ...(SHIFT_STATUSES.includes(req.query.status) ? { status: req.query.status } : {}),
        ...staffScope(user, req.query.staffId),
        ...dateRange(req.query.from, req.query.to),
        ...(list.search ? { staff: staffSearch } : {}),
      };

      const [shifts, total] = await prisma.$transaction([
        prisma.staffShift.findMany({
          where,
          include: shiftInclude,
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.staffShift.count({ where }),
      ]);

      return response.list(res, shifts, total, "Shift List Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Shift");
    }
  }

  async start(req, res) {
    try {
      const user = loadViewer(req.user);
      const body = req.body ?? {};
      const staff = await resolveStaff(user, body.staffId);
      if (staff.status !== "ACTIVE") {
        return response.error(res, "Only active staff can start a shift!", 422);
      }

      const shift = await prisma.$transaction(async (tx) => {
        const open = await tx.staffShift.findFirst({
          where: { staffId: staff.id, status: "ON_SHIFT" },
          select: { id: true },
        });
        if (open) throw fail(`${staff.firstName} ${staff.lastName} is already on shift!`, 409);
        const today = await tx.staffShift.findFirst({
          where: { staffId: staff.id, clockInAt: dayOf(new Date()) },
          select: { id: true },
        });
        if (today) throw fail(`${staff.firstName} ${staff.lastName} already had a shift today!`, 409);

        return tx.staffShift.create({
          data: {
            staffId: staff.id,
            branchId: staff.branchId,
            startedById: user.id,
            note: cleanNote(body.note),
          },
          include: shiftInclude,
        });
      });

      return response.insertionSuccess(res, shift, `${staff.firstName} ${staff.lastName} Started The Shift`);
    } catch (error) {
      return branch.handleError(res, error, "Shift");
    }
  }

  async end(req, res) {
    try {
      const { user, staff, shift: open } = await requireOpenShift(req);

      const shift = await prisma.$transaction(async (tx) => {
        await closeOpenShifts(tx, staff.id, { endedById: user.id });
        return tx.staffShift.findUnique({ where: { id: open.id }, include: shiftInclude });
      });

      return response.updateSuccess(res, shift, `${staff.firstName} ${staff.lastName} Ended The Shift`);
    } catch (error) {
      return branch.handleError(res, error, "Shift");
    }
  }

  async update(req, res) {
    try {
      const user = loadViewer(req.user);
      const body = req.body ?? {};
      const current = await findShift(user, req.params.id);
      const times = readShiftTimes(body, current);
      const breaks = readBreaks(body.breaks ?? current.breaks, times);
      const ending = !!times.clockOutAt;

      const shift = await prisma.$transaction(async (tx) => {
        await checkOneShiftPerDay(tx, current.staff, times.clockInAt, current.id);
        await saveBreaks(tx, current, breaks, user.id);
        return tx.staffShift.update({
          where: { id: current.id },
          data: {
            ...times,
            status: ending ? "COMPLETED" : "ON_SHIFT",
            endedById: ending ? (current.endedById ?? user.id) : null,
            ...(body.note !== undefined ? { note: cleanNote(body.note) } : {}),
          },
          include: shiftInclude,
        });
      });

      return response.updateSuccess(res, shift, "Shift Updated");
    } catch (error) {
      return branch.handleError(res, error, "Shift");
    }
  }

  async remove(req, res) {
    try {
      const user = loadViewer(req.user);
      const current = await findShift(user, req.params.id);
      await prisma.staffShift.delete({ where: { id: current.id } });
      return response.deletionSuccess(res, { id: current.id }, "Shift Deleted");
    } catch (error) {
      return branch.handleError(res, error, "Shift");
    }
  }
}

class ShiftBreak {
  async start(req, res) {
    try {
      const { user, staff, shift } = await requireOpenShift(req);

      await prisma.$transaction(async (tx) => {
        const open = await tx.staffShiftBreak.findFirst({
          where: { shiftId: shift.id, endAt: null },
          select: { id: true },
        });
        if (open) throw fail(`${staff.firstName} ${staff.lastName} is already on break!`, 409);

        await tx.staffShiftBreak.create({
          data: { shiftId: shift.id, startedById: user.id, note: cleanNote(req.body?.note) },
        });
      });

      return response.insertionSuccess(res, await openShiftOf(staff.id), `${staff.firstName} ${staff.lastName} Started A Break`);
    } catch (error) {
      return branch.handleError(res, error, "Break");
    }
  }

  async end(req, res) {
    try {
      const { user, staff, shift } = await requireOpenShift(req);

      const closed = await prisma.staffShiftBreak.updateMany({
        where: { shiftId: shift.id, endAt: null },
        data: { endAt: new Date(), endedById: user.id },
      });
      if (!closed.count) {
        return response.error(res, `${staff.firstName} ${staff.lastName} is not on break!`, 422);
      }

      return response.updateSuccess(res, await openShiftOf(staff.id), `${staff.firstName} ${staff.lastName} Is Back From Break`);
    } catch (error) {
      return branch.handleError(res, error, "Break");
    }
  }
}

const shift = new Shift();
shift.breaks = new ShiftBreak();
module.exports = shift;
module.exports.closeOpenShifts = closeOpenShifts;
