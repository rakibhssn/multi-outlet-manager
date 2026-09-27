const express = require("express");
const shift = require("../../controller/Shift");
const { requireAny, requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requirePermission("shifts.view"), shift.list);
router.get("/me", requirePermission("shifts.self"), shift.me);
router.post("/start", requireAny("shifts.self", "shifts.manage"), shift.start);
router.post("/end", requireAny("shifts.self", "shifts.manage"), shift.end);
router.post("/break/start", requireAny("shifts.self", "shifts.manage"), shift.breaks.start);
router.post("/break/end", requireAny("shifts.self", "shifts.manage"), shift.breaks.end);

module.exports = router;
