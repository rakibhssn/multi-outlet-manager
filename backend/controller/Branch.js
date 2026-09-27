const prisma = require("../config/prisma");
const { revokeAllSessions } = require("../helper/Session");
const commonController = require("./CommonController");
const response = require("./Response");

const OUTLET_ACCOUNTS = ["OUTLET", "OUTLET_STAFF"];
const LOW_STOCK_LIMIT = 10;
const CRITICAL_STOCK_LIMIT = 3;

const REQUIRED_FIELDS = [
  "name",
  "contactPersonName",
  "contactPersonEmail",
  "contactPersonPhone",
  "address",
  "city",
  "state",
  "zipCode",
  "country",
];

const EDITABLE_FIELDS = [...REQUIRED_FIELDS, "status"];

const SEARCH_FIELDS = REQUIRED_FIELDS;

const FIELD_LABELS = {
  Company_contactPersonEmail_key: "contact email",
  Company_contactPersonPhone_key: "contact phone",
  User_email_key: "login email",
  Staff_badgeNumber_key: "badge number",
  Company_parentId_name_key: "outlet name in this company",
  MenuItem_menuId_name_key: "item name in this menu",
  MenuItemOutlet_menuItemId_branchId_key: "item in this outlet",
  PermissionBatch_roleId_permissionId_key: "permission in this role",
  Role_key_key: "built-in role",
  Role_companyId_name_key: "role name in this company",
};

const branchAccounts = { accountType: { notIn: ["DEVELOPER", "OUTLET_STAFF"] } };
const withoutDeveloper = { users: { none: { accountType: "DEVELOPER" } } };

const accountInclude = {
  users: {
    where: branchAccounts,
    select: {
      id: true,
      email: true,
      role: { select: { id: true, key: true, name: true } },
      status: true,
      accountType: true,
    },
    orderBy: { createdAt: "asc" },
    take: 1,
  },
  _count: {
    select: {
      users: { where: branchAccounts },
      children: true,
      staffs: true,
      menuItemOutlets: true,
    },
  },
};

function pickData(body) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

function missingFields(body, fields) {
  const missing = fields.filter((field) => !String(body[field] ?? "").trim());
  return missing.length ? `Missing required fields: ${missing.join(", ")}` : null;
}

function validateAccount(user, { requirePassword }) {
  if (!user && !requirePassword) return null;
  if (!user || !String(user.email ?? "").trim()) return "Login email is required!";
  if (!/^\S+@\S+\.\S+$/.test(user.email)) return "Login email is invalid!";
  if (requirePassword && !user.password) return "Password is required!";
  if (user.password && String(user.password).length < 6) {
    return "Password must be at least 6 characters!";
  }
  return null;
}

function validateBody(body, options) {
  return missingFields(body, REQUIRED_FIELDS) ?? validateAccount(body.user, options);
}

async function accountData(user) {
  const data = { email: user.email.trim().toLowerCase() };
  if (!user.password) return data;
  const hash = commonController.generateHash();
  const password = await commonController.generateHashPassword(user.password, hash);
  return { ...data, password, hash };
}

async function saveAccount(tx, branchId, user, { roleId, accountType }) {
  const data = await accountData(user);
  const account = await tx.user.findFirst({
    where: { branchId, ...branchAccounts },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (account) {
    const roleData = user.roleId ? { roleId } : {};
    const passwordData = data.password ? { passwordChangedAt: new Date() } : {};
    if (data.password) await revokeAllSessions(account.id, tx);
    return tx.user.update({ where: { id: account.id }, data: { ...data, ...roleData, ...passwordData, accountType } });
  }
  if (!data.password) {
    throw Object.assign(new Error("Password is required to create the login account!"), {
      status: 422,
    });
  }
  return tx.user.create({ data: { ...data, roleId, accountType, branchId } });
}




async function viewerOutlet(viewer) {
  if (!viewer?.userId || !OUTLET_ACCOUNTS.includes(viewer.accountType)) return null;
  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { branchId: true },
  });
  return user?.branchId ?? null;
}

function defaultPrice(latest) {
  if (!latest) return null;
  return Number(latest.price) > 0 ? Number(latest.price) : Number(latest.basePrice);
}

function effectivePrice(latest, override) {
  return override !== null && override !== undefined ? Number(override) : defaultPrice(latest);
}

function toStock(value) {
  if (value === undefined || value === null || value === "") return null;
  const stock = Number(value);
  return Number.isInteger(stock) && stock >= 0 ? stock : undefined;
}

function listParams(query, { sortable = [], sortBy = "createdAt", orderBy = "desc" } = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const perPage = Math.min(Math.max(Number(query.per_page) || 10, 1), 100);
  const field = sortable.includes(query.sort_by) ? query.sort_by : sortBy;
  const order = ["asc", "desc"].includes(query.order_by) ? query.order_by : orderBy;

  return {
    skip: (page - 1) * perPage,
    take: perPage,
    orderBy: { [field]: order },
    search: String(query.search_by ?? "").trim(),
  };
}

function searchWhere(search, fields = SEARCH_FIELDS) {
  if (!search) return {};
  const contains = { contains: search, mode: "insensitive" };
  return { OR: fields.map((field) => ({ [field]: contains })) };
}

function handleError(res, error, label = "Record") {
  if (error.code === "P2002") {
    const index = error.meta?.driverAdapterError?.cause?.constraint?.index ?? "";
    const field = FIELD_LABELS[index] ?? "value";
    return response.error(res, `A record with this ${field} already exists!`, 409);
  }
  if (error.code === "P2025") {
    return response.notFoundError(res, `${label} Not Found!`);
  }
  if (error.code === "P2003") {
    return response.error(res, `${label} is linked with other records!`, 409);
  }
  if (error.status >= 400 && error.status < 500) {
    return response.error(res, error.message, error.status);
  }
  console.error(error);
  return response.error(res, "Something went wrong!", 500);
}

module.exports = {
  accountInclude,
  withoutDeveloper,
  pickData,
  validateBody,
  missingFields,
  validateAccount,
  accountData,
  saveAccount,
  listParams,
  toStock,
  viewerOutlet,
  LOW_STOCK_LIMIT,
  CRITICAL_STOCK_LIMIT,
  defaultPrice,
  effectivePrice,
  searchWhere,
  handleError,
};
