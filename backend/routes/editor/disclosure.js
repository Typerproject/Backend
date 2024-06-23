var express = require("express");
var router = express.Router();
const CorpCode = require("../../model/corpCode");
const { ObjectId } = require("mongodb");
const axios = require("axios");
const dotenv = require("dotenv");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");

router.get("/corpCode", async (req, res) => {
  const queryName = req.query.name;
  console.log(queryName);

  const corpCode = await CorpCode.find({
    corpName: { $regex: queryName },
  })
    .limit(10)
    .skip((req.query.page - 1) * 10);

  const totalPages = await CorpCode.countDocuments({
    corpName: { $regex: queryName },
  });

  res
    .status(200)
    .json({ result: corpCode, totalPages: Math.ceil(totalPages / 10) });
});

router.get("/list", async (req, res) => {
  const corpCode = req.query.corpCode;
  const bgn = req.query?.bgn;
  const end = req.query?.end;
  const page = req.query?.page;

  const result = await axios.get(
    `https://opendart.fss.or.kr/api/list.json?crtfc_key=${process.env.DART_URI}&corp_code=${corpCode}&bgn_de=${bgn}&end_de=${end}&page_no=${page}`
  );

  res.json(result.data);
});

router.get("/report/:code", async (req, res) => {
  const result = await axios.get(
    `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${req.params.code}`
  );

  const $ = cheerio.load(result.data, { xmlMode: true });

  const script = $("script")[$("script").length - 2];

  let type = $(script).html().includes("&quot;dart4.xsd&quot;")
    ? "dart4.xsd"
    : "HTML";

  console.log(type);

  const target = $(".btnDown");
  const spl = target.attr("onclick").split("', '");
  const rcpNo = spl[0].split("'")[1];
  const docuNo = spl[1].split("')")[0];

  const docu = await axios.get(
    `https://dart.fss.or.kr/report/viewer.do?rcpNo=${rcpNo}&dcmNo=${docuNo}&eleId=3&offset=0&length=0&dtd=${type}`,
    { responseType: "arraybuffer", responseEncoding: "binary" }
  );

  let doc = null;
  if (type === "HTML") {
    doc = cheerio.load(iconv.decode(docu.data, "ms949"));
  } else {
    doc = cheerio.load(iconv.decode(docu.data, "utf8"));
  }

  doc("meta").remove();
  doc("link").remove();
  doc("style").remove();

  doc("body *").map((idx, ele) => {
    if (ele.name === "p") {
      if (doc(ele).text() !== "") {
        doc(ele).addClass("target");
      }
    }

    if (ele.name === "table") {
      doc(ele).addClass("target");
    }

    if (ele.name === "span" && type === "HTML") {
      doc(ele).addClass("target");
    }

    if (ele.name === "img") {
      doc(ele).addClass("target");
      doc(ele).attr("src", "https://dart.fss.or.kr" + doc(ele).attr("src"));
      console.log(doc(ele).attr);
    }
  });

  doc("head").append("<style>.target:hover{background-color: yellow}</style>");

  res.send({
    type: type == "HTML" ? "HTML" : "Dart",
    body: doc.html(),
  });
  // res.send(doc.html());
});

module.exports = router;
