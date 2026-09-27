const express = require("express");
const report = require("../../controller/Report");
const { requireAll } = require("../../helper/Auth_Middleware");
const router = express.Router();

const requireReport = (req, res, next) => requireAll("reports.view", `reports.${req.params.type}`)(req, res, next);

router.get("/:type", requireReport, report.generate);

module.exports = router;
