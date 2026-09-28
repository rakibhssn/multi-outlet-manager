export const SUPER_ADMIN_KEY = "SUPER_ADMIN";

export const hasAccess = (access) => Array.isArray(access?.permissions);

export const isSuperAdmin = (access) => access?.roleKey === SUPER_ADMIN_KEY;

const holds = (access, key) =>
  isSuperAdmin(access) || !!access?.permissions?.includes(key);

export const canAccess = (access, permission) =>
  !permission || [permission].flat().some((key) => holds(access, key));

export const canAll = (access, permissions) =>
  [permissions].flat().every((key) => holds(access, key));
