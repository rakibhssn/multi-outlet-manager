const prisma = require("../config/prisma");
const commonController = require("./CommonController");
const response = require("./Response");
const { accessOf: roleAccess, roleAccessSelect } = require("../helper/Role_Access");
const { revokeSession, rotateSession, startSession } = require("../helper/Session");

const userInclude = {
  company: {
    include: { parent: { select: { id: true, name: true } } },
  },
  role: { select: roleAccessSelect },
};

function withAccess(row) {
  const { role, ...user } = row;
  const access = roleAccess(role);
  return {
    user: { ...user, role: { id: role.id, key: role.key, name: role.name } },
    access: { ...access, permissions: [...access.permissions] },
  };
}

class Auth {
  async signIn(req, res) {
    try {
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const password = String(req.body?.password ?? "");
      const findUser = await prisma.user.findFirst({
        where: {
          email,
        },
        select: { id: true, email: true, password: true, hash: true, accountType: true, status: true },
      });

      if (!findUser) {
        return response.notFoundError(res, "User Credentials Not Found!");
      }

      const passMatch = await commonController.compareHashPassword(
        findUser.password,
        password,
        findUser.hash,
      );

      if (!passMatch) {
        return response.error(res, "User Credentials Not Matching!", 401);
      }

      if (findUser.status !== "ACTIVE") {
        return response.error(res, "Your account is inactive. Please contact your administrator.", 403);
      }

      const tokens = await startSession(findUser.id, req);
      const user = await prisma.user.update({
        where: { id: findUser.id },
        data: { lastLoginAt: new Date() },
        omit: { password: true, hash: true },
        include: userInclude,
      });
      return response.success(
        res,
        {
          ...tokens,
          ...withAccess(user),
        },
        `User Logged In Successfully`,
        200,
      );
    } catch (error) {
      console.error(error);
      return response.error(res, "Something went wrong!", 500);
    }
  }

  async me(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        omit: { password: true, hash: true },
        include: userInclude,
      });
      return response.success(res, withAccess(user), "Account Fetched Successfully");
    } catch (error) {
      return response.error(res, "Something went wrong!", 500);
    }
  }

  async refresh(req, res) {
    try {
      const tokens = await rotateSession(req.body?.refreshToken, req);
      return response.success(res, tokens, "Session Refreshed");
    } catch (error) {
      if (error.status === 401) return response.error(res, error.message, 401);
      console.error(error);
      return response.error(res, "Something went wrong!", 500);
    }
  }

  async signOut(req, res) {
    try {
      await revokeSession(req.user.sessionId);
      return response.success(res, null, "Signed Out Successfully");
    } catch (error) {
      console.error(error);
      return response.error(res, "Something went wrong!", 500);
    }
  }
}

const auth = new Auth();
module.exports = auth;
