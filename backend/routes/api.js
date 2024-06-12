const stockRouter = require("./editor/stock");
const reportRouter = require("./editor/report");

var express = require("express");
var router = express.Router();

router.use(
  "/editor/stock",
  (req, res, next) => {
    next();
  },
  stockRouter
);

router.use(
  "/editor/report",
  (req, res, next) => {
    next();
  },
  reportRouter
);

module.exports = router;
