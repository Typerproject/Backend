const stockRouter = require("./editor/stock");
const reportRouter = require("./editor/report");
const financeRouter = require("./editor/finance");

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

router.use(
  "/editor/finance",
  (req, res, next) => {
    next();
  },
  financeRouter
);

module.exports = router;
