const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const response = require("../controller/Response");
const { can, canAll, canAny, isSuperAdmin } = require("./Permissions");
const { accessOf, roleAccessSelect } = require("./Role_Access");
const { isSessionLive, touchSession } = require("./Session");

const DENIED = "You do not have access to this action";

function readToken(header) {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.substring(7);
  try {
    const payload = token ? jwt.verify(token, process.env.JWT_ACCESS_SECRET) : null;
    return payload?.type === "access" && payload.sid ? payload : null;
  } catch {
    return null;
  }
}

function loadSession(sessionId) {
  return prisma.userSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      expiresAt: true,
      lastUsedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          accountType: true,
          branchId: true,
          staffId: true,
          status: true,
          role: { select: roleAccessSelect },
        },
      },
    },
  });
}

function sessionOf(account, sessionId) {
  return {
    sessionId,
    userId: account.id,
    email: account.email,
    accountType: account.accountType,
    branchId: account.branchId,
    staffId: account.staffId,
    ...accessOf(account.role),
  };
}

function logDenied(req, required, mode) {
  console.warn(
    JSON.stringify({
      event: "security.permission.denied",
      at: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl.split("?")[0],
      userId: req.user?.userId ?? null,
      roleKey: req.user?.roleKey ?? null,
      required,
      mode,
    }),
  );
}

function deny(req, res, required, mode) {
  logDenied(req, required, mode);
  return response.error(res, DENIED, 403);
}

async function authorization(req, res, next) {
  const token = readToken(req.headers.authorization);
  if (!req.headers.authorization?.startsWith("Bearer ")) {
    return response.error(res, "Authentication Required!", 401);
  }
  if (!token?.userId) {
    return response.error(res, "Invalid/Expired Access Token!", 401);
  }

  try {
    const session = await loadSession(token.sid);
    if (!isSessionLive(session, token.userId)) {
      return response.error(res, "Your session has ended. Please sign in again.", 401);
    }
    if (session.user.status !== "ACTIVE") {
      return response.error(res, "Your account is no longer active!", 401);
    }
    touchSession(session);
    req.user = sessionOf(session.user, session.id);
    return next();
  } catch (error) {
    return response.error(res, "Unable to verify your access right now!", 503);
  }
}

const requirePermission = (permission) => (req, res, next) =>
  can(req.user, permission) ? next() : deny(req, res, [permission], "one");

const requireAll =
  (...permissions) =>
  (req, res, next) =>
    canAll(req.user, permissions) ? next() : deny(req, res, permissions, "all");

const requireAny =
  (...permissions) =>
  (req, res, next) =>
    canAny(req.user, permissions) ? next() : deny(req, res, permissions, "any");

const requireSelfOr =
  (param, ...permissions) =>
  (req, res, next) =>
    req.user?.staffId === req.params[param] || canAny(req.user, permissions)
      ? next()
      : deny(req, res, permissions, "self-or-any");

const requireSuperAdmin = (req, res, next) =>
  isSuperAdmin(req.user) ? next() : deny(req, res, ["SUPER_ADMIN"], "role");

const requireDeveloper = (req, res, next) =>
  req.user?.accountType === "DEVELOPER" ? next() : deny(req, res, ["DEVELOPER"], "account");

module.exports = {
  authorization,
  requirePermission,
  requireAll,
  requireAny,
  requireSelfOr,
  requireSuperAdmin,
  requireDeveloper,
};
