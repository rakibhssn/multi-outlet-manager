const express = require("express");
const reminder = require("../../controller/Reminder");
const { requirePermission } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", requirePermission("reminders.view"), reminder.list);
router.post("/", requirePermission("reminders.create"), reminder.create);
router.put("/:id", requirePermission("reminders.edit"), reminder.update);
router.patch("/:id/done", requirePermission("reminders.edit"), reminder.setDone);
router.delete("/:id", requirePermission("reminders.delete"), reminder.remove);

module.exports = router;
