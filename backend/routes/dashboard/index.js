const express = require("express");
const dashboard = require("../../controller/Dashboard");
const { requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/company", requirePermission("dashboard.view"), dashboard.company);
router.get("/company/outlets", requirePermission("dashboard.view"), dashboard.companyOutlets);
router.get("/company/activity", requirePermission("dashboard.view"), dashboard.companyActivity);
router.get("/company/trend", requirePermission("dashboard.view"), dashboard.companyTrend);
router.get("/outlet", requirePermission("dashboard.view"), dashboard.outlet);
router.get("/outlet/low-stock", requirePermission("dashboard.view"), dashboard.lowStock);

module.exports = router;
