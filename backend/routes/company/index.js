const express = require("express");
const company = require("../../controller/Company");
const { requireAny, requireDeveloper, requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requireAny("companies.view", "outlets.view"), company.list);
router.get("/:id", requireAny("companies.view", "outlets.view"), company.details);
router.post("/", requireDeveloper, requirePermission("companies.create"), company.create);
router.put("/:id", requireDeveloper, requirePermission("companies.edit"), company.update);
router.patch("/:id/status", requireDeveloper, requirePermission("companies.edit"), company.changeStatus);
router.delete("/:id", requireDeveloper, requirePermission("companies.delete"), company.remove);

module.exports = router;
