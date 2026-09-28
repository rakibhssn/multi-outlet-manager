const express = require("express");
const { upload } = require("../../controller/Upload");
const { requireAny } = require("../../helper/Auth_Middleware");
const router = express.Router();

router.post(
  "/image",
  requireAny(
    "menus.create",
    "menus.edit",
    "items.create",
    "items.edit",
    "staff.create",
    "staff.edit",
    "outlets.create",
    "outlets.edit",
    "companies.create",
    "companies.edit",
  ),
  upload.image,
);

module.exports = router;
