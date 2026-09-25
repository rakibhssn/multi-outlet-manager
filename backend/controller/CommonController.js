const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

class CommonController {
  #ACCESS_TOKEN_EXPIRES = "12h";
  #REFRESH_TOKEN_EXPIRES = "24h";

  generateHash() {
    return crypto.randomBytes(32).toString("hex");
  }

  async generateHashPassword(password, hash) {
    return crypto.Hmac("sha256", hash).update(password).digest("hex");
  }

  async compareHashPassword(oldPassword, password, hash) {
    const checkPassword = await this.generateHashPassword(password, hash);
    return oldPassword === checkPassword;
  }

  createAccessToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email, type: "access" },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: this.#ACCESS_TOKEN_EXPIRES },
    );
  }

  createRefreshToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        type: "refresh",
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: this.#REFRESH_TOKEN_EXPIRES,
      },
    );
  }
}

const commonController = new CommonController();
module.exports = commonController;
