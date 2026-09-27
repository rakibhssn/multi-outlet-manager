const express = require("express");
const staff = require("../../controller/Staff");
const { requireAny, requirePermission, requireSelfOr } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requireAny("staff.view", "orders.create", "shifts.manage", "reports.view"), staff.list);
router.get("/:id", requireSelfOr("id", "staff.view"), staff.details);
router.post("/", requirePermission("staff.create"), staff.create);
router.put("/:id", requirePermission("staff.edit"), staff.update);
router.patch("/:id/status", requirePermission("staff.edit"), staff.changeStatus);
router.delete("/:id", requirePermission("staff.delete"), staff.remove);
router.post("/:id/transfer", requirePermission("staff.transfer"), staff.transfer);
router.get("/:id/assignments", requirePermission("staff.history"), staff.assignments);

module.exports = router;
