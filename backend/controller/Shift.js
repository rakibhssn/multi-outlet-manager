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

async function requireOpenShift(req) {
  const user = loadViewer(req.user);
  const staff = await resolveStaff(user, req.body?.staffId);
  const shift = await openShiftOf(staff.id);
  if (!shift) throw fail(`${staff.firstName} ${staff.lastName} is not on shift!`, 422);
  return { user, staff, shift };
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
        ...(req.query.staffId ? { staffId: req.query.staffId } : {}),
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
