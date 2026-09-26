const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");

const OUTLET_ACCOUNT = { role: "ADMIN", accountType: "OUTLET" };
const outletOnly = { parentId: { not: null } };

const outletInclude = {
  ...branch.accountInclude,
  parent: { select: { id: true, name: true } },
};

async function findCompany(companyId) {
  if (!companyId) return null;
  return prisma.company.findFirst({
    where: { id: companyId, parentId: null, ...branch.withoutDeveloper },
    select: { id: true },
  });
}

function lastDays(count) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (count - 1 - index));
    return day.toISOString().slice(0, 10);
  });
}

function sampleDailySales(seed, dates) {
  let state = [...String(seed)].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 2147483647, 7);
  const next = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  const base = 6000 + Math.round(next() * 6000);

  return dates.map((date) => {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const weekend = weekday === 5 || weekday === 6 ? 1.35 : 1;
    const amount = base * weekend * (0.7 + next() * 0.6);
    return { date, amount: Math.round(amount * 100) / 100 };
  });
}

function toOverride(value) {
  if (value === undefined || value === null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

class Outlet {
  async list(req, res) {
    try {
      const list = branch.listParams(req.query, { sortable: ["name", "contactPersonName", "city", "status", "createdAt"] });
      const where = {
        ...outletOnly,
        ...(req.query.companyId ? { parentId: req.query.companyId } : {}),
        ...(req.query.status ? { status: req.query.status } : {}),
        ...branch.searchWhere(list.search),
      };

      const [outlets, total] = await prisma.$transaction([
        prisma.company.findMany({
          where,
          include: outletInclude,
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.company.count({ where }),
      ]);

      return response.list(res, outlets, total, "Outlet List Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Outlet");
    }
  }

  async details(req, res) {
    try {
      const outlet = await prisma.company.findFirst({
        where: { id: req.params.id, ...outletOnly },
        include: outletInclude,
      });

      if (!outlet) {
        return response.notFoundError(res, "Outlet Not Found!");
      }

      const [assignedItems, inStock] = await prisma.$transaction([
        prisma.menuItemOutlet.count({ where: { branchId: outlet.id } }),
        prisma.menuItemOutlet.count({ where: { branchId: outlet.id, stock: { gt: 0 } } }),
      ]);

      return response.success(
        res,
        {
          ...outlet,
          summary: {
            assignedItems,
            inStock,
            stockOut: assignedItems - inStock,
            salesAmount: 0,
            dailySales: sampleDailySales(outlet.id, lastDays(7)),
            dailySalesSample: true,
          },
        },
        "Outlet Fetched Successfully",
      );
    } catch (error) {
      return branch.handleError(res, error, "Outlet");
    }
  }

  async create(req, res) {
    try {
      const invalid = branch.validateBody(req.body, { requirePassword: true });
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      if (!(await findCompany(req.body.companyId))) {
        return response.error(res, "Select a valid company for this outlet!", 422);
      }

      const outlet = await prisma.company.create({
        data: {
          ...branch.pickData(req.body),
          parentId: req.body.companyId,
          users: {
            create: {
              ...(await branch.accountData(req.body.user)),
              ...OUTLET_ACCOUNT,
            },
          },
        },
        include: outletInclude,
      });

      return response.insertionSuccess(res, outlet, "Outlet Created Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Outlet");
    }
  }

  async update(req, res) {
    try {
      const invalid = branch.validateBody(req.body, { requirePassword: false });
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      if (!(await findCompany(req.body.companyId))) {
        return response.error(res, "Select a valid company for this outlet!", 422);
      }

      const exists = await prisma.company.count({ where: { id: req.params.id, ...outletOnly } });
      if (!exists) {
        return response.notFoundError(res, "Outlet Not Found!");
      }

      const outlet = await prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: req.params.id },
          data: { ...branch.pickData(req.body), parentId: req.body.companyId },
        });

        if (req.body.user) {
          await branch.saveAccount(tx, req.params.id, req.body.user, OUTLET_ACCOUNT);
        }

        return tx.company.findUnique({
          where: { id: req.params.id },
          include: outletInclude,
        });
      });

      return response.updateSuccess(res, outlet, "Outlet Updated Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Outlet");
    }
  }

  async assignItems(req, res) {
    try {
      const entries = [].concat(req.body.items ?? []).filter((entry) => entry?.menuItemId);
      const menuItemIds = [...new Set(entries.map((entry) => entry.menuItemId))];
      if (!menuItemIds.length) {
        return response.error(res, "Select at least one menu item!", 422);
      }

      const invalidPrice = entries.find((entry) => toOverride(entry.price) === undefined);
      if (invalidPrice) {
        return response.error(res, "Outlet price must be a positive number!", 422);
      }

      if (entries.some((entry) => branch.toStock(entry.stock) === undefined)) {
        return response.error(res, "Stock must be a whole number of 0 or more!", 422);
      }

      const exists = await prisma.company.count({ where: { id: req.params.id, ...outletOnly } });
      if (!exists) {
        return response.notFoundError(res, "Outlet Not Found!");
      }

      const items = await prisma.menuItem.count({ where: { id: { in: menuItemIds } } });
      if (items !== menuItemIds.length) {
        return response.error(res, "Select valid menu items only!", 422);
      }

      await prisma.$transaction(
        entries.map((entry) =>
          prisma.menuItemOutlet.upsert({
            where: { menuItemId_branchId: { menuItemId: entry.menuItemId, branchId: req.params.id } },
            create: {
              menuItemId: entry.menuItemId,
              branchId: req.params.id,
              price: toOverride(entry.price),
              stock: branch.toStock(entry.stock) ?? 0,
            },
            update: {
              price: toOverride(entry.price),
              ...(branch.toStock(entry.stock) !== null ? { stock: branch.toStock(entry.stock) } : {}),
            },
          }),
        ),
      );

      return response.insertionSuccess(
        res,
        { assigned: menuItemIds.length },
        `${menuItemIds.length} Item${menuItemIds.length === 1 ? "" : "s"} Assigned Successfully`,
      );
    } catch (error) {
      return branch.handleError(res, error, "Outlet");
    }
  }

  async changeStatus(req, res) {
    try {
      const current = await prisma.company.findFirst({
        where: { id: req.params.id, ...outletOnly },
        select: { status: true },
      });

      if (!current) {
        return response.notFoundError(res, "Outlet Not Found!");
      }

      const outlet = await prisma.company.update({
        where: { id: req.params.id },
        data: { status: current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
        include: outletInclude,
      });

      return response.updateSuccess(res, outlet, `Outlet Marked ${outlet.status}`);
    } catch (error) {
      return branch.handleError(res, error, "Outlet");
    }
  }

  async remove(req, res) {
    try {
      const exists = await prisma.company.count({ where: { id: req.params.id, ...outletOnly } });
      if (!exists) {
        return response.notFoundError(res, "Outlet Not Found!");
      }

      const staffs = await prisma.staff.count({ where: { branchId: req.params.id } });
      if (staffs) {
        return response.error(res, "Remove the staff of this outlet first!", 409);
      }

      const history = await prisma.staffAssignment.count({ where: { branchId: req.params.id } });
      if (history) {
        return response.error(
          res,
          "This outlet is part of staff work history and cannot be deleted. Mark it inactive instead.",
          409,
        );
      }

      const outlet = await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({ where: { branchId: req.params.id } });
        return tx.company.delete({ where: { id: req.params.id } });
      });

      return response.deletionSuccess(res, outlet, "Outlet Deleted Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Outlet");
    }
  }
}

const outlet = new Outlet();
module.exports = outlet;
