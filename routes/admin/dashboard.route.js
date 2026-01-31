const express = require("express");
const router = express.Router();
const dashboardcontroller = require("../../controllers/admin/dashboard.controller");
router.get("/", dashboardcontroller.dashboard);
module.exports = router;