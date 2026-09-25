const express = require("express");
const outlet = require("../../controller/Outlet");
const router = express.Router();

router.get("/", outlet.list);
router.get("/:id", outlet.details);
router.post("/", outlet.create);
router.put("/:id", outlet.update);
router.patch("/:id/status", outlet.changeStatus);
router.delete("/:id", outlet.remove);

module.exports = router;
