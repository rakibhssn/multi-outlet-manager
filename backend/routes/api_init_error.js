const response = require("../controller/Response");

const NOT_FOUND = (res) => response.notFoundError(res, "Endpoint not found!");

const ACCESS_DENIED = (res) => response.error(res, "Direct Access denied!", 403);

module.exports = {
  NOT_FOUND,
  ACCESS_DENIED,
};
