const commonController = require("./CommonController");
const response = require("./Response");

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
};

const branchAccounts = { accountType: { notIn: ["DEVELOPER", "OUTLET_STAFF"] } };
const withoutDeveloper = { users: { none: { accountType: "DEVELOPER" } } };

const accountInclude = {
  users: {
    where: branchAccounts,
    select: { id: true, email: true, role: true, status: true, accountType: true },
    orderBy: { createdAt: "asc" },
    take: 1,
  },
  _count: {
    select: { users: { where: branchAccounts }, children: true, staffs: true },
  },
};

function pickData(body) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

function validateBody(body, { requirePassword }) {
  const missing = REQUIRED_FIELDS.filter((field) => !String(body[field] ?? "").trim());
  if (missing.length) return `Missing required fields: ${missing.join(", ")}`;

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

async function accountData(user) {
  const data = { email: user.email.trim().toLowerCase() };
  if (!user.password) return data;
  const hash = commonController.generateHash();
  const password = await commonController.generateHashPassword(user.password, hash);
  return { ...data, password, hash };
}

async function saveAccount(tx, branchId, user, { role, accountType }) {
  const data = await accountData(user);
  const account = await tx.user.findFirst({
    where: { branchId, ...branchAccounts },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (account) {
    return tx.user.update({ where: { id: account.id }, data: { ...data, accountType } });
  }
  if (!data.password) {
    throw Object.assign(new Error("Password is required to create the login account!"), {
      status: 422,
    });
  }
  return tx.user.create({ data: { ...data, role, accountType, branchId } });
}

function paging(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const perPage = Math.min(Math.max(Number(query.perPage) || 10, 1), 100);
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

function searchWhere(query) {
  const search = String(query.search ?? "").trim();
  const contains = { contains: search, mode: "insensitive" };
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(search ? { OR: SEARCH_FIELDS.map((field) => ({ [field]: contains })) } : {}),
  };
}

function paginated(items, total, { page, perPage }) {
  return {
    items,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.max(Math.ceil(total / perPage), 1),
    },
  };
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
  return response.error(res, error.message, error.status ?? 500);
}

module.exports = {
  accountInclude,
  withoutDeveloper,
  pickData,
  validateBody,
  accountData,
  saveAccount,
  paging,
  searchWhere,
  paginated,
  handleError,
};
