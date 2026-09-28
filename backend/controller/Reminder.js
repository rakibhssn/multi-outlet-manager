const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");
const { addReply, threadRelations } = require("../helper/Reminder_Thread");

const TITLE_LIMIT = 120;
const NOTES_LIMIT = 1000;
const PRIORITIES = ["LOW", "NORMAL", "HIGH"];
const STATUSES = ["OPEN", "DONE"];

const reminderInclude = {
  outlet: { select: { id: true, name: true } },
  staff: { select: { id: true, firstName: true, lastName: true, badgeNumber: true } },
  createdBy: { select: { id: true, email: true } },
  ...threadRelations,
};

const fail = (message, status = 422) => Object.assign(new Error(message), { status });

const isDeveloper = (viewer) => viewer.accountType === "DEVELOPER";

function companyFilter(viewer, requested) {
  if (!isDeveloper(viewer)) return { companyId: viewer.branchId ?? "" };
  return requested ? { companyId: requested } : {};
}

function statusFilter(status) {
  if (status === "all") return {};
  return { status: STATUSES.includes(status) ? status : "OPEN" };
}

const orderFor = (status) =>
  status === "DONE" ? [{ completedAt: "desc" }] : [{ status: "asc" }, { dueAt: "asc" }];

function readText(value, label, limit, required) {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw fail(`${label} is required!`);
  if (text.length > limit) throw fail(`${label} must be ${limit} characters or less!`);
  return text || null;
}

function readDueAt(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw fail("Pick a valid due date and time!");
  return date;
}

function readPriority(value) {
  if (value === undefined) return "NORMAL";
  if (!PRIORITIES.includes(value)) throw fail("Invalid priority!");
  return value;
}

async function outletOf(outletId) {
  if (!outletId) return null;
  const outlet = await prisma.company.findFirst({
    where: { id: outletId, parentId: { not: null } },
    select: { id: true, parentId: true },
  });
  if (!outlet) throw fail("Select a valid outlet!");
  return outlet;
}

async function companyFor(viewer, body, outlet) {
  if (!isDeveloper(viewer)) {
    if (!viewer.branchId) throw fail("Only headquarter accounts can keep reminders!", 403);
    return viewer.branchId;
  }
  const companyId = outlet?.parentId ?? body?.companyId;
  if (!companyId) throw fail("Pick an outlet so the reminder belongs to a company!");
  return companyId;
}

async function checkMentions(companyId, outlet, staffId) {
  if (outlet && outlet.parentId !== companyId) throw fail("That outlet is not in this company!");
  if (!staffId) return;
  const staff = await prisma.staff.count({ where: { id: staffId, outlet: { parentId: companyId } } });
  if (!staff) throw fail("That staff member is not in this company!");
}

async function reminderData(viewer, body) {
  const outlet = await outletOf(body?.outletId || null);
  const companyId = await companyFor(viewer, body, outlet);
  const staffId = body?.staffId || null;
  await checkMentions(companyId, outlet, staffId);
  return {
    companyId,
    outletId: outlet?.id ?? null,
    staffId,
    title: readText(body?.title, "Title", TITLE_LIMIT, true),
    notes: readText(body?.notes, "Notes", NOTES_LIMIT, false),
    dueAt: readDueAt(body?.dueAt),
    priority: readPriority(body?.priority),
  };
}

async function findReminder(id, viewer) {
  const reminder = await prisma.reminder.findFirst({
    where: { id, ...companyFilter(viewer) },
    select: { id: true, status: true },
  });
  if (!reminder) throw fail("Reminder Not Found!", 404);
  return reminder;
}

async function counts(scope) {
  const [open, overdue, done] = await Promise.all([
    prisma.reminder.count({ where: { ...scope, status: "OPEN" } }),
    prisma.reminder.count({ where: { ...scope, status: "OPEN", dueAt: { lt: new Date() } } }),
    prisma.reminder.count({ where: { ...scope, status: "DONE" } }),
  ]);
  return { open, overdue, done };
}

class Reminder {
  async list(req, res) {
    try {
      const { skip, take } = branch.listParams(req.query);
      const scope = companyFilter(req.user, req.query.companyId);
      const where = { ...scope, ...statusFilter(req.query.status) };
      const [rows, total, summary] = await Promise.all([
        prisma.reminder.findMany({ where, include: reminderInclude, orderBy: orderFor(req.query.status), skip, take }),
        prisma.reminder.count({ where }),
        counts(scope),
      ]);
      return res.status(200).json({ status: "success", message: "Reminders Fetched Successfully", data: rows, total, summary });
    } catch (error) {
      return branch.handleError(res, error, "Reminder");
    }
  }

  async create(req, res) {
    try {
      const data = await reminderData(req.user, req.body);
      const reminder = await prisma.reminder.create({
        data: { ...data, createdById: req.user.userId },
        include: reminderInclude,
      });
      return response.insertionSuccess(res, reminder, "Reminder Created");
    } catch (error) {
      return branch.handleError(res, error, "Reminder");
    }
  }

  async update(req, res) {
    try {
      const current = await findReminder(req.params.id, req.user);
      const data = await reminderData(req.user, req.body);
      const reminder = await prisma.reminder.update({
        where: { id: current.id },
        data,
        include: reminderInclude,
      });
      return response.updateSuccess(res, reminder, "Reminder Updated");
    } catch (error) {
      return branch.handleError(res, error, "Reminder");
    }
  }

  async setDone(req, res) {
    try {
      const current = await findReminder(req.params.id, req.user);
      const done = req.body?.done !== false;
      const reminder = await prisma.reminder.update({
        where: { id: current.id },
        data: { status: done ? "DONE" : "OPEN", completedAt: done ? new Date() : null },
        include: reminderInclude,
      });
      return response.updateSuccess(res, reminder, done ? "Reminder Marked Done" : "Reminder Reopened");
    } catch (error) {
      return branch.handleError(res, error, "Reminder");
    }
  }

  async reply(req, res) {
    try {
      const branchId = await branch.viewerOutlet(req.user);
      if (!branchId) throw fail("Only outlet accounts can reply to notices!", 403);
      const accepted = await addReply(req.params.id, branchId, req.user.userId, req.body);
      const reminder = await prisma.reminder.findUnique({ where: { id: req.params.id }, include: reminderInclude });
      return response.insertionSuccess(res, reminder, accepted ? "Notice Accepted" : "Reply Sent");
    } catch (error) {
      return branch.handleError(res, error, "Notice");
    }
  }

  async remove(req, res) {
    try {
      const current = await findReminder(req.params.id, req.user);
      await prisma.reminder.delete({ where: { id: current.id } });
      return response.deletionSuccess(res, { id: current.id }, "Reminder Deleted");
    } catch (error) {
      return branch.handleError(res, error, "Reminder");
    }
  }
}

const reminderController = new Reminder();
module.exports = reminderController;
