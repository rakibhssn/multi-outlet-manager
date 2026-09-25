const express = require("express");
const menuItem = require("../../controller/MenuItem");
const router = express.Router();

router.get("/", menuItem.list);
router.get("/:id", menuItem.details);
router.post("/", menuItem.create);
router.put("/:id", menuItem.update);
router.delete("/:id", menuItem.remove);

module.exports = router;
