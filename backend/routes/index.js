const express = require("express");
const { NOT_FOUND } = require("./api_init_error");
const router = express.Router();
const { authorization } = require("../helper/Auth_Middleware");

router.get("/", (req, res) => {
  NOT_FOUND(res);
});

router.use("/auth", require("./auth"));
router.use("/account", authorization, require("./account"));
router.use("/company", authorization, require("./company"));
router.use("/outlet", authorization, require("./outlet"));
router.use("/staff", authorization, require("./staff"));
router.use("/menu", authorization, require("./menu"));
router.use("/menu-item", authorization, require("./menu-item"));
router.use("/sales-order", authorization, require("./sales-order"));
router.use("/dashboard", authorization, require("./dashboard"));
router.use("/shift", authorization, require("./shift"));
router.use("/report", authorization, require("./report"));
router.use("/role", authorization, require("./role"));
router.use("/reminder", authorization, require("./reminder"));
router.use("/upload", authorization, require("./upload"));

router.use((req, res) => NOT_FOUND(res));

module.exports = router;
