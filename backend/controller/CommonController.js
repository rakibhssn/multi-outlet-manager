const crypto = require("node:crypto");

class CommonController {
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
}

const commonController = new CommonController();
module.exports = commonController;
