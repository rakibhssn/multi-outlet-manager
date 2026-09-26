const express = require("express");
const menuItem = require("../../controller/MenuItem");
const router = express.Router();

router.get("/", menuItem.list);
router.get("/:id", menuItem.details);
router.post("/", menuItem.create);
router.put("/:id", menuItem.update);
router.delete("/:id", menuItem.remove);
router.get("/:id/outlets", menuItem.outlets);
router.post("/:id/outlets", menuItem.assignOutlets);
router.put("/:id/outlets/:outletId", menuItem.updateOutlet);
router.delete("/:id/outlets/:outletId", menuItem.unassignOutlet);

module.exports = router;
