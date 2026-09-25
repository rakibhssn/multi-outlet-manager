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

class Outlet {
  async list(req, res) {
    try {
      const page = branch.paging(req.query);
      const where = {
        ...outletOnly,
        ...(req.query.companyId ? { parentId: req.query.companyId } : {}),
        ...branch.searchWhere(req.query),
      };

      const [total, outlets] = await prisma.$transaction([
        prisma.company.count({ where }),
        prisma.company.findMany({
          where,
          include: outletInclude,
          orderBy: { createdAt: "desc" },
          skip: page.skip,
          take: page.take,
        }),
      ]);

      return response.success(
        res,
        branch.paginated(outlets, total, page),
        "Outlet List Fetched Successfully",
      );
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

      return response.success(res, outlet, "Outlet Fetched Successfully");
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
