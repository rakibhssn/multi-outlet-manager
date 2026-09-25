const express = require("express");
const menu = require("../../controller/Menu");
const router = express.Router();

router.get("/", menu.list);
router.get("/:id", menu.details);
router.post("/", menu.create);
router.put("/:id", menu.update);
router.patch("/:id/status", menu.changeStatus);
router.delete("/:id", menu.remove);

module.exports = router;
