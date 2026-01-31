const express = require("express");
const router = express.Router();
const productscontroller = require("../../controllers/client/products.controller");
router.get("/", productscontroller.index);
router.get("/:slug", productscontroller.detail);
module.exports = router;