const express = require("express");
const dashboard = require("../../controller/Dashboard");
const alert = require("../../controller/Alert");
const { requireAny, requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

const HQ_STATS = ["dashboard.hq.outlets", "dashboard.hq.revenue", "dashboard.hq.orders", "dashboard.hq.employees"];
const OUTLET_STATS = ["dashboard.outlet.sales", "dashboard.outlet.orders", "dashboard.outlet.staff", "dashboard.outlet.stock"];

router.use(requirePermission("dashboard.view"));

router.get("/company", requireAny(...HQ_STATS), dashboard.company);
router.get("/company/outlets", requirePermission("dashboard.hq.revenue"), dashboard.companyOutlets);
router.get("/company/activity", requirePermission("dashboard.hq.activity"), dashboard.companyActivity);
router.get("/company/trend", requirePermission("dashboard.hq.performance"), dashboard.companyTrend);
router.get("/company/alerts", requirePermission("dashboard.hq.alerts"), alert.list);
router.get("/company/alerts/:type", requirePermission("dashboard.hq.alerts"), alert.details);
router.get("/outlet", requireAny(...OUTLET_STATS), dashboard.outlet);
router.get("/outlet/low-stock", requirePermission("dashboard.outlet.stock"), dashboard.lowStock);
router.get("/outlet/notices", requirePermission("dashboard.outlet.notices"), dashboard.notices);
router.get("/outlet/popular-items", requirePermission("dashboard.outlet.popular"), dashboard.popularItems);
router.get("/outlet/staff-schedule", requirePermission("dashboard.outlet.schedule"), dashboard.staffSchedule);

module.exports = router;
