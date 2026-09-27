const express = require("express");
const account = require("../../controller/Account");
const router = express.Router();

router.get("/", account.details);
router.patch("/password", account.changePassword);
router.delete("/sessions", account.revokeOthers);
router.delete("/sessions/:id", account.revokeOne);

module.exports = router;
