const express = require("express");
const { NOT_FOUND } = require("./api_init_error");
const router = express.Router();

router.get("/", (req, res) => {
  NOT_FOUND(res);
});

router.use("/auth", require("./auth"));
router.use("/company", require("./company"));
router.use("/outlet", require("./outlet"));
router.use("/staff", require("./staff"));
router.use("/menu", require("./menu"));
router.use("/menu-item", require("./menu-item"));
router.use("/upload", require("./upload"));

module.exports = router;
