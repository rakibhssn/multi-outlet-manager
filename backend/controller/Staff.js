const prisma = require("../config/prisma");
const { Prisma } = require("../../generated/prisma");
const response = require("./Response");
const branch = require("./Branch");

const STAFF_ACCOUNT = { role: "USER", accountType: "OUTLET_STAFF" };

const REQUIRED_FIELDS = [
  "branchId",
  "badgeNumber",
  "designation",
  "employmentType",
  "jobTitle",
  "firstName",
  "lastName",
  "phone",
  "gender",
  "dob",
  "address1",
  "city",
  "state",
  "country",
];

const OPTIONAL_FIELDS = ["email", "address2", "salaryType", "status"];

const SEARCH_FIELDS = ["firstName", "lastName", "email", "phone", "badgeNumber", "jobTitle", "city"];

const DESIGNATIONS = [
  "GENERAL_MANAGER",
  "ASSISTANT_MANAGER",
  "SHIFT_MANAGER",
  "CASHIER",
  "SERVER",
  "HOST",
  "COOK",
  "CHEF",
  "KITCHEN_STAFF",
  "BARISTA",
  "DELIVERY_DRIVER",
  "CLEANER",
];
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "TEMPORARY", "SEASONAL", "CONTRACTOR"];
const SALARY_TYPES = ["HOURLY", "SALARY"];

const staffInclude = {
  outlet: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
  users: {
    select: { id: true, email: true, role: true, status: true, accountType: true },
    orderBy: { createdAt: "asc" },
    take: 1,
  },
  assignments: {
    where: { endDate: null },
    select: { id: true, startDate: true },
    orderBy: { startDate: "desc" },
    take: 1,
  },
};

const assignmentInclude = {
  outlet: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
};

async function withOutletsWorked(staffs) {
  const list = [].concat(staffs).filter(Boolean);
  if (!list.length) return staffs;

  const rows = await prisma.$queryRaw`
    SELECT "staffId", COUNT(DISTINCT "branchId")::int AS "outlets"
    FROM "StaffAssignment"
    WHERE "staffId" IN (${Prisma.join(list.map((staff) => staff.id))})
    GROUP BY "staffId"
  `;
  const counts = Object.fromEntries(rows.map((row) => [row.staffId, row.outlets]));
  const result = list.map((staff) => ({ ...staff, outletsWorked: counts[staff.id] ?? 0 }));

  return Array.isArray(staffs) ? result : result[0];
}

async function moveStaff(tx, staff, branchId, date, note) {
  await tx.staffAssignment.updateMany({
    where: { staffId: staff.id, endDate: null },
    data: { endDate: date },
  });
  await tx.staffAssignment.create({
    data: { staffId: staff.id, branchId, startDate: date, note: note || null },
  });
  await tx.staff.update({ where: { id: staff.id }, data: { branchId } });
  await tx.user.updateMany({ where: { staffId: staff.id }, data: { branchId } });
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function pickData(body) {
  const data = {};
  for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
    if (body[field] !== undefined) data[field] = body[field] === "" ? null : body[field];
  }
  if (body.hireDate) data.hireDate = toDate(body.hireDate);
  if (body.exitDate !== undefined) data.exitDate = toDate(body.exitDate);
  return data;
}

function validateBody(body, { requirePassword }) {
  const missing = REQUIRED_FIELDS.filter((field) => !String(body[field] ?? "").trim());
  if (missing.length) return `Missing required fields: ${missing.join(", ")}`;
  if (!DESIGNATIONS.includes(body.designation)) return "Invalid designation!";
  if (!EMPLOYMENT_TYPES.includes(body.employmentType)) return "Invalid employment type!";
  if (body.salaryType && !SALARY_TYPES.includes(body.salaryType)) return "Invalid salary type!";
  if (body.hireDate && toDate(body.hireDate) === undefined) return "Invalid hire date!";
  if (body.exitDate && toDate(body.exitDate) === undefined) return "Invalid exit date!";

  const { user } = body;
  if (!user && !requirePassword) return null;
  if (!user || !String(user.email ?? "").trim()) return "Login email is required!";
  if (!/^\S+@\S+\.\S+$/.test(user.email)) return "Login email is invalid!";
  if (requirePassword && !user.password) return "Password is required!";
  if (user.password && String(user.password).length < 6) {
    return "Password must be at least 6 characters!";
  }
  return null;
}

async function findOutlet(branchId) {
  if (!branchId) return null;
  return prisma.company.findFirst({
    where: { id: branchId, parentId: { not: null } },
    select: { id: true },
  });
}

async function saveStaffAccount(tx, staff, user) {
  const data = await branch.accountData(user);
  const account = await tx.user.findFirst({
    where: { staffId: staff.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (account) {
    return tx.user.update({
      where: { id: account.id },
      data: { ...data, branchId: staff.branchId },
    });
  }
  if (!data.password) {
    throw Object.assign(new Error("Password is required to create the login account!"), {
      status: 422,
    });
  }
  return tx.user.create({
    data: { ...data, ...STAFF_ACCOUNT, branchId: staff.branchId, staffId: staff.id },
  });
}

class Staff {
  async list(req, res) {
    try {
      const list = branch.listParams(req.query, { sortable: ["firstName", "badgeNumber", "designation", "hireDate", "status", "createdAt"] });
      const where = {
        ...(req.query.branchId ? { branchId: req.query.branchId } : {}),
        ...(req.query.companyId ? { outlet: { parentId: req.query.companyId } } : {}),
        ...(req.query.designation ? { designation: req.query.designation } : {}),
        ...(req.query.status ? { status: req.query.status } : {}),
        ...branch.searchWhere(list.search, SEARCH_FIELDS),
      };

      const [staffs, total] = await prisma.$transaction([
        prisma.staff.findMany({
          where,
          include: staffInclude,
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.staff.count({ where }),
      ]);

      return response.list(res, await withOutletsWorked(staffs), total, "Staff List Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Staff");
    }
  }

  async details(req, res) {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id: req.params.id },
        include: staffInclude,
      });

      if (!staff) {
        return response.notFoundError(res, "Staff Not Found!");
      }

      return response.success(res, staff, "Staff Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Staff");
    }
  }

  async create(req, res) {
    try {
      const invalid = validateBody(req.body, { requirePassword: true });
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      if (!(await findOutlet(req.body.branchId))) {
        return response.error(res, "Select a valid outlet for this staff!", 422);
      }

      const data = pickData(req.body);
      const staff = await prisma.staff.create({
        data: {
          ...data,
          users: {
            create: {
              ...(await branch.accountData(req.body.user)),
              ...STAFF_ACCOUNT,
              branchId: req.body.branchId,
            },
          },
          assignments: {
            create: {
              branchId: req.body.branchId,
              startDate: data.hireDate ?? new Date(),
              note: "Initial posting",
            },
          },
        },
        include: staffInclude,
      });

      return response.insertionSuccess(res, staff, "Staff Created Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Staff");
    }
  }

  async update(req, res) {
    try {
      const invalid = validateBody(req.body, { requirePassword: false });
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      if (!(await findOutlet(req.body.branchId))) {
        return response.error(res, "Select a valid outlet for this staff!", 422);
      }

      const current = await prisma.staff.findUnique({
        where: { id: req.params.id },
        select: { id: true, branchId: true },
      });
      if (!current) {
        return response.notFoundError(res, "Staff Not Found!");
      }

      const staff = await prisma.$transaction(async (tx) => {
        const { branchId, ...data } = pickData(req.body);
        if (branchId && branchId !== current.branchId) {
          await moveStaff(tx, current, branchId, new Date(), "Moved while editing staff");
        }

        const updated = await tx.staff.update({
          where: { id: req.params.id },
          data,
        });

        if (req.body.user) {
          await saveStaffAccount(tx, updated, req.body.user);
        }

        return tx.staff.findUnique({ where: { id: req.params.id }, include: staffInclude });
      });

      return response.updateSuccess(res, staff, "Staff Updated Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Staff");
    }
  }

  async changeStatus(req, res) {
    try {
      const current = await prisma.staff.findUnique({
        where: { id: req.params.id },
        select: { status: true },
      });

      if (!current) {
        return response.notFoundError(res, "Staff Not Found!");
      }

      const staff = await prisma.staff.update({
        where: { id: req.params.id },
        data: { status: current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
        include: staffInclude,
      });

      return response.updateSuccess(res, staff, `Staff Marked ${staff.status}`);
    } catch (error) {
      return branch.handleError(res, error, "Staff");
    }
  }

  async transfer(req, res) {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id: req.params.id },
        select: { id: true, branchId: true, firstName: true, lastName: true },
      });
      if (!staff) {
        return response.notFoundError(res, "Staff Not Found!");
      }

      const { branchId, note } = req.body;
      if (!(await findOutlet(branchId))) {
        return response.error(res, "Select a valid outlet to transfer to!", 422);
      }
      if (branchId === staff.branchId) {
        return response.error(res, "Staff already works at this outlet!", 422);
      }

      const date = req.body.transferDate ? toDate(req.body.transferDate) : new Date();
      if (!date) {
        return response.error(res, "Invalid transfer date!", 422);
      }
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (date > today) {
        return response.error(res, "Transfer date cannot be in the future!", 422);
      }

      const open = await prisma.staffAssignment.findFirst({
        where: { staffId: staff.id, endDate: null },
        orderBy: { startDate: "desc" },
        select: { startDate: true },
      });
      if (open && date < open.startDate) {
        return response.error(res, "Transfer date cannot be before the current posting started!", 422);
      }

      await prisma.$transaction(async (tx) => {
        await moveStaff(tx, staff, branchId, date, note ? String(note).trim() : null);
      });

      const updated = await prisma.staff.findUnique({ where: { id: staff.id }, include: staffInclude });

      return response.updateSuccess(
        res,
        await withOutletsWorked(updated),
        `${staff.firstName} ${staff.lastName} Transferred To ${updated.outlet?.name}`,
      );
    } catch (error) {
      return branch.handleError(res, error, "Staff");
    }
  }

  async assignments(req, res) {
    try {
      const staff = await prisma.staff.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!staff) {
        return response.notFoundError(res, "Staff Not Found!");
      }

      const list = branch.listParams(req.query, {
        sortable: ["startDate", "endDate"],
        sortBy: "startDate",
        orderBy: "desc",
      });
      const where = { staffId: staff.id };

      const [assignments, total] = await prisma.$transaction([
        prisma.staffAssignment.findMany({
          where,
          include: assignmentInclude,
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.staffAssignment.count({ where }),
      ]);

      return response.list(res, assignments, total, "Staff Postings Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Staff");
    }
  }

  async remove(req, res) {
    try {
      const staff = await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({ where: { staffId: req.params.id } });
        return tx.staff.delete({ where: { id: req.params.id } });
      });

      return response.deletionSuccess(res, staff, "Staff Deleted Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Staff");
    }
  }
}

const staff = new Staff();
module.exports = staff;
