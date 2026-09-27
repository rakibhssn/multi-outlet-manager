const express = require("express");
const { NOT_FOUND } = require("../api_init_error");
const auth = require("../../controller/Auth");
const { authorization } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.get("/", (req, res) => {
  NOT_FOUND(res);
});

router.post("/login", auth.signIn);
router.post("/refresh", auth.refresh);
router.post("/logout", authorization, auth.signOut);
router.get("/me", authorization, auth.me);

module.exports = router;
