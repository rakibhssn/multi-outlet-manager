const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");

const { roleIdFor } = require("../helper/Role_Access");
const { SUPER_ADMIN_KEY } = require("../helper/Permissions");

const COMPANY_ACCOUNT_TYPE = "HEADQUARTER";

async function companyAccount() {
  return { roleId: await roleIdFor(SUPER_ADMIN_KEY), accountType: COMPANY_ACCOUNT_TYPE };
}
const companyOnly = { parentId: null, ...branch.withoutDeveloper };

class Company {
  async list(req, res) {
    try {
      const list = branch.listParams(req.query, { sortable: ["name", "contactPersonName", "city", "status", "createdAt"] });
      const where = {
        ...companyOnly,
        ...(req.query.status ? { status: req.query.status } : {}),
        ...branch.searchWhere(list.search),
      };

      const [companies, total] = await prisma.$transaction([
        prisma.company.findMany({
          where,
          include: branch.accountInclude,
          orderBy: list.orderBy,
          skip: list.skip,
          take: list.take,
        }),
        prisma.company.count({ where }),
      ]);

      return response.list(res, companies, total, "Company List Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Company");
    }
  }

  async details(req, res) {
    try {
      const company = await prisma.company.findFirst({
        where: { id: req.params.id, ...companyOnly },
        include: branch.accountInclude,
      });

      if (!company) {
        return response.notFoundError(res, "Company Not Found!");
      }

      return response.success(res, company, "Company Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Company");
    }
  }

  async create(req, res) {
    try {
      const invalid = branch.validateBody(req.body, { requirePassword: true });
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      const company = await prisma.company.create({
        data: {
          ...branch.pickData(req.body),
          users: {
            create: {
              ...(await branch.accountData(req.body.user)),
              ...(await companyAccount()),
            },
          },
        },
        include: branch.accountInclude,
      });

      return response.insertionSuccess(res, company, "Company Created Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Company");
    }
  }

  async update(req, res) {
    try {
      const invalid = branch.validateBody(req.body, { requirePassword: false });
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      const company = await prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: req.params.id },
          data: branch.pickData(req.body),
        });

        if (req.body.user) {
          await branch.saveAccount(tx, req.params.id, req.body.user, await companyAccount());
        }

        return tx.company.findUnique({
          where: { id: req.params.id },
          include: branch.accountInclude,
        });
      });

      return response.updateSuccess(res, company, "Company Updated Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Company");
    }
  }

  async changeStatus(req, res) {
    try {
      const current = await prisma.company.findUnique({
        where: { id: req.params.id },
        select: { status: true },
      });

      if (!current) {
        return response.notFoundError(res, "Company Not Found!");
      }

      const company = await prisma.company.update({
        where: { id: req.params.id },
        data: { status: current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
        include: branch.accountInclude,
      });

      return response.updateSuccess(res, company, `Company Marked ${company.status}`);
    } catch (error) {
      return branch.handleError(res, error, "Company");
    }
  }

  async remove(req, res) {
    try {
      const protectedAccounts = await prisma.user.count({
        where: { branchId: req.params.id, accountType: "DEVELOPER" },
      });
      if (protectedAccounts) {
        return response.error(
          res,
          "This company holds a system admin account and cannot be deleted!",
          403,
        );
      }

      const outlets = await prisma.company.count({ where: { parentId: req.params.id } });
      if (outlets) {
        return response.error(res, "Remove the outlets under this company first!", 409);
      }

      const company = await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({ where: { branchId: req.params.id } });
        return tx.company.delete({ where: { id: req.params.id } });
      });

      return response.deletionSuccess(res, company, "Company Deleted Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Company");
    }
  }
}

const company = new Company();
module.exports = company;
