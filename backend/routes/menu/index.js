const express = require("express");
const menu = require("../../controller/Menu");
const { requireAny, requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requireAny("menus.view", "items.view", "orders.create", "outlets.stock"), menu.list);
router.get("/:id", requireAny("menus.view", "items.view"), menu.details);
router.post("/", requirePermission("menus.create"), menu.create);
router.put("/:id", requirePermission("menus.edit"), menu.update);
router.patch("/:id/status", requirePermission("menus.edit"), menu.changeStatus);
router.delete("/:id", requirePermission("menus.delete"), menu.remove);

module.exports = router;
