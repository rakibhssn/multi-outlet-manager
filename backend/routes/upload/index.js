const express = require("express");
const { upload } = require("../../controller/Upload");
const router = express.Router();

router.post("/image", upload.image);

module.exports = router;
