const express = require("express");
const salesOrder = require("../../controller/SalesOrder");
const { requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requirePermission("orders.view"), salesOrder.list);
router.get("/items", requirePermission("orders.create"), salesOrder.stockedItems);
router.get("/:id", requirePermission("orders.view"), salesOrder.details);
router.post("/", requirePermission("orders.create"), salesOrder.create);
router.patch("/:id/complete", requirePermission("orders.complete"), salesOrder.complete);
router.patch("/:id/cancel", requirePermission("orders.cancel"), salesOrder.cancel);
router.patch("/:id/slip", requirePermission("orders.slip"), salesOrder.slip);

module.exports = router;
