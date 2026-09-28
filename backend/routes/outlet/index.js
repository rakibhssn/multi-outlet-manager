const express = require("express");
const outlet = require("../../controller/Outlet");
const { requireAny, requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requireAny("outlets.view", "staff.view", "reports.view", "outlets.stock", "orders.view"), outlet.list);
router.get("/:id", requirePermission("outlets.view"), outlet.details);
router.post("/", requirePermission("outlets.create"), outlet.create);
router.put("/:id", requirePermission("outlets.edit"), outlet.update);
router.patch("/:id/status", requirePermission("outlets.edit"), outlet.changeStatus);
router.post("/:id/items", requirePermission("outlets.stock"), outlet.assignItems);
router.delete("/:id", requirePermission("outlets.delete"), outlet.remove);

module.exports = router;
