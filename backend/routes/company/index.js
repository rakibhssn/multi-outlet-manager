const express = require("express");
const company = require("../../controller/Company");
const router = express.Router();

router.get("/", company.list);
router.get("/:id", company.details);
router.post("/", company.create);
router.put("/:id", company.update);
router.patch("/:id/status", company.changeStatus);
router.delete("/:id", company.remove);

module.exports = router;
