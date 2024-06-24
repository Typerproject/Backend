var express = require("express");
var router = express.Router();
const Report = require("../../model/analyst");
const axios = require("axios");
const dotenv = require("dotenv");
router.get("/", async function (req, res) {
  const name = req.query.company;
  const fromDate = req.query.fromDate;
  const toDate = req.query.toDate;
  let page = Number(req.query.page);

  const limit = 5;
  const result = [];
  let nextDate = "";

  if ("2024-06-08" < toDate) {
    const response = await axios.get(
      `https://markets.hankyung.com/api/v2/consensus/search/report?&fromDate=2024-06-08&toDate=${toDate}&reportType=CO&gradeCode=ALL&changePrices=ALL&searchWord=${name}&searchType=ALL&reportRange=${limit}&page=${page}`,
      {
        headers: {
          Authorization: process.env.BEARER,
        },
      }
    );

    const data = response.data;

    if (data.data.length !== 0) {
      data.data.map((elem, idx) => {
        if (elem.REPORT_DATE < "2024-06-08") {
          return;
        }
        result.push({
          company: elem.BUSINESS_NAME + `(${elem.BUSINESS_CODE})`,
          date: elem.REPORT_DATE,
          analyst: elem.REPORT_WRITER,
          title: elem.REPORT_TITLE,
          url: `https://consensus.hankyung.com/analysis/downpdf?report_idx=${elem.REPORT_IDX}`,
        });
        nextDate = elem.REPORT_DATE;
      });
    }

    if (result.length < limit) {
      page = 1;
    }
  }

  if (result.length < limit) {
    const fromDBList = await Report.find({
      date: { $lte: toDate, $gte: fromDate },
      company: { $regex: name },
    })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log(fromDBList);

    fromDBList.map((elem) => {
      result.push({
        company: elem.company,
        date: elem.date,
        analyst: elem.analyst,
        title: elem.title,
        url: elem.url,
      });
    });

    nextDate = "2024-06-08";
  }

  page += 1;

  if (result.length === 0) {
    res.json({
      nextDate: "",
      result: result,
    });
    return;
  }

  res.json({
    nextDate: nextDate,
    nextPage: page,
    result: result,
  });
});
module.exports = router;
