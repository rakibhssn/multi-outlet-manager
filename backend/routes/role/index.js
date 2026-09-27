const express = require("express");
const role = require("../../controller/Role");
const { requireAny, requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requirePermission("roles.view"), role.list);
router.get("/options", requireAny("staff.create", "staff.edit", "outlets.create", "outlets.edit"), role.options);
router.post("/", requirePermission("roles.manage"), role.create);
router.patch("/:id", requirePermission("roles.manage"), role.update);
router.delete("/:id", requirePermission("roles.manage"), role.remove);

module.exports = router;
