const SUPER_ADMIN_KEY = "SUPER_ADMIN";

const SYSTEM_ROLES = [
  {
    key: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Developer and headquarter accounts. Always holds every permission.",
    isSystem: true,
  },
  { key: "ADMIN", name: "Outlet Admin", description: "Outlet accounts that run a single outlet." },
  { key: "MANAGER", name: "Manager", description: "Outlet staff who supervise orders, shifts and reports." },
  { key: "USER", name: "Staff", description: "Outlet staff who take orders and track their own shift." },
];

const ACCOUNT_DEFAULT_ROLE = {
  DEVELOPER: "SUPER_ADMIN",
  HEADQUARTER: "SUPER_ADMIN",
  OUTLET: "ADMIN",
  OUTLET_STAFF: "USER",
};

const PERMISSION_GROUPS = [
  {
    label: "Dashboard",
    permissions: [{ key: "dashboard.view", label: "View", kind: "page" }],
  },
  {
    label: "Companies",
    permissions: [
      { key: "companies.view", label: "View", kind: "page", hq: true },
      { key: "companies.create", label: "Create", kind: "action", hq: true },
      { key: "companies.edit", label: "Edit & set status", kind: "action", hq: true },
      { key: "companies.delete", label: "Delete", kind: "action", hq: true },
    ],
  },
  {
    label: "Outlets",
    permissions: [
      { key: "outlets.view", label: "View", kind: "page", hq: true },
      { key: "outlets.create", label: "Create", kind: "action", hq: true },
      { key: "outlets.edit", label: "Edit & set status", kind: "action", hq: true },
      { key: "outlets.delete", label: "Delete", kind: "action", hq: true },
      { key: "outlets.stock", label: "Assign items, prices & stock", kind: "action", hq: true },
    ],
  },
  {
    label: "Staff",
    permissions: [
      { key: "staff.view", label: "View", kind: "page" },
      { key: "staff.create", label: "Add", kind: "action" },
      { key: "staff.edit", label: "Edit & set status", kind: "action" },
      { key: "staff.delete", label: "Delete", kind: "action" },
      { key: "staff.transfer", label: "Transfer between outlets", kind: "action", hq: true },
      { key: "staff.history", label: "View work history", kind: "action", hq: true },
    ],
  },
  {
    label: "Menus",
    permissions: [
      { key: "menus.view", label: "View", kind: "page" },
      { key: "menus.create", label: "Create", kind: "action", hq: true },
      { key: "menus.edit", label: "Edit & set status", kind: "action", hq: true },
      { key: "menus.delete", label: "Delete", kind: "action", hq: true },
    ],
  },
  {
    label: "Menu items",
    permissions: [
      { key: "items.view", label: "View", kind: "page" },
      { key: "items.create", label: "Create", kind: "action", hq: true },
      { key: "items.edit", label: "Edit & set price", kind: "action", hq: true },
      { key: "items.delete", label: "Delete", kind: "action", hq: true },
    ],
  },
  {
    label: "Sales orders",
    permissions: [
      { key: "orders.view", label: "View", kind: "page" },
      { key: "orders.create", label: "Take orders (POS)", kind: "page" },
      { key: "orders.complete", label: "Complete", kind: "action" },
      { key: "orders.cancel", label: "Cancel", kind: "action" },
      { key: "orders.slip", label: "Print order slip", kind: "action" },
    ],
  },
  {
    label: "Shifts",
    permissions: [
      { key: "shifts.view", label: "View", kind: "page" },
      { key: "shifts.self", label: "Own shift & breaks", kind: "action" },
      { key: "shifts.manage", label: "Clock in & manage others", kind: "action" },
    ],
  },
  {
    label: "Reports",
    permissions: [
      { key: "reports.view", label: "Open reports", kind: "page" },
      { key: "reports.sales", label: "Sales", kind: "action" },
      { key: "reports.items", label: "Item sales", kind: "action" },
      { key: "reports.servers", label: "Servers", kind: "action" },
      { key: "reports.shifts", label: "Staff shifts", kind: "action" },
      { key: "reports.attendance", label: "Attendance", kind: "action" },
      { key: "reports.stock", label: "Stock", kind: "action" },
      { key: "reports.export", label: "Print & download", kind: "action" },
    ],
  },
  {
    label: "Roles",
    permissions: [
      { key: "roles.view", label: "View roles", kind: "page", hq: true },
      { key: "roles.manage", label: "Create & edit roles", kind: "action", hq: true },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => ({ ...permission, group: group.label })),
);
const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map((permission) => permission.key);
const HQ_ONLY_PERMISSIONS = ALL_PERMISSIONS.filter((permission) => permission.hq).map((permission) => permission.key);

const REPORT_PERMISSIONS = [
  "reports.sales",
  "reports.items",
  "reports.servers",
  "reports.shifts",
  "reports.attendance",
  "reports.stock",
];
const OUTLET_REPORTS = ["reports.view", ...REPORT_PERMISSIONS, "reports.export"];
const OUTLET_BASE = [
  "dashboard.view",
  "menus.view",
  "items.view",
  "orders.view",
  "orders.create",
  "orders.slip",
  "shifts.view",
];

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: [
    ...OUTLET_BASE,
    "staff.view",
    "staff.create",
    "staff.edit",
    "staff.delete",
    "orders.complete",
    "orders.cancel",
    "shifts.manage",
    ...OUTLET_REPORTS,
  ],
  MANAGER: [
    ...OUTLET_BASE,
    "staff.view",
    "orders.complete",
    "orders.cancel",
    "shifts.self",
    "shifts.manage",
    ...OUTLET_REPORTS,
  ],
  USER: [...OUTLET_BASE, "orders.complete", "shifts.self"],
};

const DEFAULT_NEW_ROLE_PERMISSIONS = ["dashboard.view", "menus.view", "items.view", "orders.view"];

const KEY_SET = new Set(ALL_PERMISSION_KEYS);

const sanitizePermissions = (keys) => {
  const wanted = new Set([keys].flat().filter((key) => typeof key === "string" && KEY_SET.has(key)));
  return ALL_PERMISSION_KEYS.filter((key) => wanted.has(key));
};

const assignablePermissions = (keys) => sanitizePermissions(keys).filter((key) => !HQ_ONLY_PERMISSIONS.includes(key));

const effectivePermissions = (roleKey, keys) =>
  roleKey === SUPER_ADMIN_KEY ? [...ALL_PERMISSION_KEYS] : assignablePermissions(keys);

const isSuperAdmin = (grantee) => grantee?.roleKey === SUPER_ADMIN_KEY;

const can = (grantee, permission) => !!grantee && (isSuperAdmin(grantee) || !!grantee.permissions?.has(permission));

const canAny = (grantee, permissions) => permissions.some((permission) => can(grantee, permission));

const canAll = (grantee, permissions) => permissions.every((permission) => can(grantee, permission));

module.exports = {
  SUPER_ADMIN_KEY,
  SYSTEM_ROLES,
  ACCOUNT_DEFAULT_ROLE,
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  HQ_ONLY_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_NEW_ROLE_PERMISSIONS,
  sanitizePermissions,
  assignablePermissions,
  effectivePermissions,
  isSuperAdmin,
  can,
  canAny,
  canAll,
};
