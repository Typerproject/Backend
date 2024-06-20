var express = require("express");
var router = express.Router();
const report = require("../../model/analyst");

router.get("/", async function (req, res) {
  const name = req.query.company;
  const page = parseInt(req.query.page);
  const limit =parseInt(req.query.limit);
  

  const finalreport = await report.find();
  const new_report = finalreport.filter((elem) =>
    elem.company.split("(")[0].includes(name)
  );

  
  const totalpages=Math.ceil(new_report.length/limit);

  const currentReports = new_report.slice((page - 1) * limit, page * limit);
  console.log(currentReports)
  res.json({currentReports,totalpages});
});

router.get("/all", async function (req, res) {
  const allreport = await report.find();
  res.json(allreport);
});

module.exports = router;
