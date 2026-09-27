const prisma = require("../config/prisma");
const commonController = require("./CommonController");
const response = require("./Response");
const branch = require("./Branch");
const { activeSessionWhere, revokeOtherSessions, revokeSession } = require("../helper/Session");

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;

const accountSelect = {
  id: true,
  email: true,
  accountType: true,
  status: true,
  lastLoginAt: true,
  passwordChangedAt: true,
  createdAt: true,
  role: { select: { id: true, key: true, name: true, description: true } },
  company: { select: { id: true, name: true, city: true, country: true, parent: { select: { id: true, name: true } } } },
  staff: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      badgeNumber: true,
      designation: true,
      jobTitle: true,
      phone: true,
      email: true,
      hireDate: true,
    },
  },
};

const sessionSelect = { id: true, userAgent: true, ip: true, createdAt: true, lastUsedAt: true };

const fieldError = (field, message) => Object.assign(new Error(message), { status: 422, field });

function readPasswords(body) {
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");
  if (!currentPassword) throw fieldError("currentPassword", "Enter your current password");
  if (newPassword.length < MIN_PASSWORD) throw fieldError("newPassword", `Use at least ${MIN_PASSWORD} characters`);
  if (newPassword.length > MAX_PASSWORD) throw fieldError("newPassword", "Password is too long");
  if (newPassword === currentPassword) {
    throw fieldError("newPassword", "The new password must differ from the current one");
  }
  if (confirmPassword !== newPassword) throw fieldError("confirmPassword", "The two passwords do not match");
  return { currentPassword, newPassword };
}

function fieldFailure(res, error) {
  return res.status(422).json({ status: "error", message: error.message, fieldErrors: { [error.field]: error.message } });
}

async function sessionsOf(req) {
  const sessions = await prisma.userSession.findMany({
    where: activeSessionWhere(req.user.userId),
    select: sessionSelect,
    orderBy: { lastUsedAt: "desc" },
  });
  return sessions.map((session) => ({ ...session, current: session.id === req.user.sessionId }));
}

class Account {
  async details(req, res) {
    try {
      const account = await prisma.user.findUnique({ where: { id: req.user.userId }, select: accountSelect });
      if (!account) return response.notFoundError(res, "Account Not Found!");
      return response.success(res, { ...account, sessions: await sessionsOf(req) }, "Account Fetched Successfully");
    } catch (error) {
      return branch.handleError(res, error, "Account");
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = readPasswords(req.body);
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, password: true, hash: true },
      });
      if (!user) return response.notFoundError(res, "Account Not Found!");

      const matches = await commonController.compareHashPassword(user.password, currentPassword, user.hash);
      if (!matches) throw fieldError("currentPassword", "That is not your current password");

      const hash = commonController.generateHash();
      const password = await commonController.generateHashPassword(newPassword, hash);
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { password, hash, passwordChangedAt: new Date() } }),
        prisma.userSession.updateMany({
          where: { ...activeSessionWhere(user.id), id: { not: req.user.sessionId } },
          data: { revokedAt: new Date() },
        }),
      ]);

      return response.success(res, { changed: true }, "Password Changed. Other devices have been signed out.");
    } catch (error) {
      if (error.field) return fieldFailure(res, error);
      return branch.handleError(res, error, "Account");
    }
  }

  async revokeOthers(req, res) {
    try {
      const { count } = await revokeOtherSessions(req.user.userId, req.user.sessionId);
      return response.success(res, { revoked: count }, count ? `Signed out of ${count} other session(s)` : "No other session was active");
    } catch (error) {
      return branch.handleError(res, error, "Session");
    }
  }

  async revokeOne(req, res) {
    try {
      const session = await prisma.userSession.findFirst({
        where: { ...activeSessionWhere(req.user.userId), id: req.params.id },
        select: { id: true },
      });
      if (!session) return response.notFoundError(res, "Session Not Found!");
      await revokeSession(session.id);
      return response.success(res, { id: session.id }, "Session Signed Out");
    } catch (error) {
      return branch.handleError(res, error, "Session");
    }
  }
}

const accountController = new Account();
module.exports = accountController;
