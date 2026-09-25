const prisma = require("../config/prisma");
const response = require("./Response");
const branch = require("./Branch");

const SEARCH_FIELDS = ["name", "description"];

const menuInclude = { _count: { select: { menuItems: true } } };

function pickData(body) {
  return {
    name: String(body.name ?? "").trim(),
    description: body.description ? String(body.description).trim() : null,
    menuImage: body.menuImage ? String(body.menuImage).trim() : null,
    ...(body.status ? { status: body.status } : {}),
  };
}

function validateBody(body) {
  if (!String(body.name ?? "").trim()) return "Menu name is required!";
  if (body.status && !["ACTIVE", "INACTIVE"].includes(body.status)) return "Invalid status!";
  return null;
}

class Menu {
  async list(req, res) {
    try {
      const page = branch.paging(req.query);
      const search = String(req.query.search ?? "").trim();
      const contains = { contains: search, mode: "insensitive" };
      const where = {
        ...(req.query.status ? { status: req.query.status } : {}),
        ...(search ? { OR: SEARCH_FIELDS.map((field) => ({ [field]: contains })) } : {}),
      };

      const [total, menus] = await prisma.$transaction([
        prisma.menu.count({ where }),
        prisma.menu.findMany({
          where,
          include: menuInclude,
          orderBy: { createdAt: "desc" },
          skip: page.skip,
          take: page.take,
        }),
      ]);

      return response.success(res, branch.paginated(menus, total, page), "Menu List Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async details(req, res) {
    try {
      const menu = await prisma.menu.findUnique({
        where: { id: req.params.id },
        include: menuInclude,
      });

      if (!menu) {
        return response.notFoundError(res, "Menu Not Found!");
      }

      return response.success(res, menu, "Menu Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async create(req, res) {
    try {
      const invalid = validateBody(req.body);
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      const menu = await prisma.menu.create({
        data: pickData(req.body),
        include: menuInclude,
      });

      return response.insertionSuccess(res, menu, "Menu Created Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async update(req, res) {
    try {
      const invalid = validateBody(req.body);
      if (invalid) {
        return response.error(res, invalid, 422);
      }

      const menu = await prisma.menu.update({
        where: { id: req.params.id },
        data: pickData(req.body),
        include: menuInclude,
      });

      return response.updateSuccess(res, menu, "Menu Updated Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async changeStatus(req, res) {
    try {
      const current = await prisma.menu.findUnique({
        where: { id: req.params.id },
        select: { status: true },
      });

      if (!current) {
        return response.notFoundError(res, "Menu Not Found!");
      }

      const menu = await prisma.menu.update({
        where: { id: req.params.id },
        data: { status: current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
        include: menuInclude,
      });

      return response.updateSuccess(res, menu, `Menu Marked ${menu.status}`);
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }

  async remove(req, res) {
    try {
      const items = await prisma.menuItem.count({ where: { menuId: req.params.id } });
      if (items) {
        return response.error(res, "Remove the items of this menu first!", 409);
      }

      const menu = await prisma.menu.delete({ where: { id: req.params.id } });

      return response.deletionSuccess(res, menu, "Menu Deleted Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Menu");
    }
  }
}

const menu = new Menu();
module.exports = menu;
