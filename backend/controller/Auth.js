const prisma = require("../config/prisma");
const commonController = require("./CommonController");
const response = require("./Response");

class Auth {
  async signIn(req, res) {
    try {
      const { email, password } = req.body;
      const findUser = await prisma.user.findFirst({
        where: {
          email,
        },
        select: { id: true, email: true, password: true, hash: true },
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

      const accessToken = commonController.createAccessToken(findUser);
      const refreshToken = commonController.createRefreshToken(findUser);

      const user = await prisma.user.findFirst({
        where: { email },
        omit: { password: true, hash: true },
        include: {
          company: {
            include: { parent: { select: { id: true, name: true } } },
          },
        },
      });
      return response.success(
        res,
        {
          accessToken,
          refreshToken,
          user,
          expiresIn: 43200,
        },
        `User Logged In Successfully`,
        200,
      );
    } catch (error) {
      return response.error(res, error.message);
    }
  }

  forgotPassword({ email }) {}

  changePassword({ email, oldPassword, newPassword }) {}

  signOut({ email }) {}
}

const auth = new Auth();
module.exports = auth;
