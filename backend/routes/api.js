const stockRouter = require("./editor/stock");
const reportRouter = require("./editor/report");
const financeRouter = require("./editor/finance");
const newsRouter = require("./editor/news");

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

router.use(
  "/editor/news",
  newsRouter
)

module.exports = router;
