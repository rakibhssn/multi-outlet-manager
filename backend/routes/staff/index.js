const express = require("express");
const staff = require("../../controller/Staff");
const router = express.Router();

router.get("/", staff.list);
router.get("/:id", staff.details);
router.post("/", staff.create);
router.put("/:id", staff.update);
router.patch("/:id/status", staff.changeStatus);
router.delete("/:id", staff.remove);

module.exports = router;
