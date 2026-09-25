const express = require("express");
const { NOT_FOUND } = require("../api_init_error");
const auth = require("../../controller/Auth");
const router = express.Router();

router.get("/", (req, res) => {
  NOT_FOUND(res);
});

router.post("/login", auth.signIn);

module.exports = router;
