const express = require("express");
const menuItem = require("../../controller/MenuItem");
const { requireAny, requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requireAny("items.view", "menus.view", "outlets.stock"), menuItem.list);
router.get("/:id", requirePermission("items.view"), menuItem.details);
router.post("/", requirePermission("items.create"), menuItem.create);
router.put("/:id", requirePermission("items.edit"), menuItem.update);
router.delete("/:id", requirePermission("items.delete"), menuItem.remove);
router.get("/:id/outlets", requireAny("items.view", "outlets.stock"), menuItem.outlets);
router.post("/:id/outlets", requirePermission("outlets.stock"), menuItem.assignOutlets);
router.put("/:id/outlets/:outletId", requirePermission("outlets.stock"), menuItem.updateOutlet);
router.delete("/:id/outlets/:outletId", requirePermission("outlets.stock"), menuItem.unassignOutlet);

module.exports = router;
