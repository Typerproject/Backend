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

  const type = $(script).html().includes("&quot;dart4.xsd&quot;")
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
  });

  doc("head").append(
    '<style> BODY{margin-left:20px; width:600px; font-size:12pt; font-family:DartNBSP, "바탕", Batang; word-break:break-all;} body{margin-left:20px; width:600px; font-size:12pt; font-family:DartNBSP, "바탕", Batang; word-break:break-all;}  TABLE {table-layout:fixed; font-size:11pt; font-family:DartNBSP, "굴림", Gulim; border-collapse:collapse; border-style:solid; border-color:black; color:#000000; margin-bottom:6px;} TABLE.nb {border-style:none;} THEAD > TR > TD {font-size:11pt; line-height:1.6em; font-family:DartNBSP, "굴림", Gulim; background-color:#dcdcdc; border-color:gray; padding:4px 4px 2px 4px;} TH {font-size:11pt; line-height:1.6em; font-family:DartNBSP, "굴림", Gulim; font-weight:normal; background-color:#dcdcdc; border-color:gray; padding:4px 4px 2px 4px;} TD {font-size:11pt; line-height:1.6em; font-family:DartNBSP, "굴림", Gulim; border-color:gray; padding:4px 4px 2px 4px;} P {font-size:12pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; color:#000000; margin:0px;} BODY > P {font-size:12pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:justify; color:#000000; margin:0px;} TH > P {font-size:11pt; line-height:1.6em; font-family:DartNBSP, "굴림", Gulim;} TD > P {font-size:11pt; line-height:1.6em; font-family:DartNBSP, "굴림", Gulim;} P.table-group {font-size:11pt; font-family:DartNBSP, "굴림", Gulim; text-align:center;} P.table-group-xbrl {font-size:11pt; font-family:DartNBSP, "굴림", Gulim; text-align:left;} P.img-caption {font-size:12pt; font-family:DartNBSP, "굴림", Gulim; text-align:center; color:#324a58;} P.part {font-size:20pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:center; color:#0000ff; font-weight:bold; white-space:nowrap;} P.section-1 {font-size:18pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:center; color:#0000ff; font-weight:bold; white-space:nowrap;} P.section-2 {font-size:16pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:left; color:#0000ff; font-weight:bold; white-space:nowrap;} P.section-3 {font-size:14pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:left; color:#0000ff;} P.section-4 {font-size:14pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:left; color:#0000ff;} P.section-5 {font-size:12pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:left; color:#0000ff;} P.section-6 {font-size:12pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:left; color:#0000ff;} P.cover-title {font-size:28pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:center; color:#0000ff; font-weight:bold; white-space:nowrap;} P.correction {font-size:28pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:center; color:#0000ff; font-weight:bold; white-space:nowrap;} P.description {font-size:12pt; line-height:1.6em; font-family:DartNBSP, "바탕", Batang; text-align:left; color:#324a58;} P.pgbrk {height:24px;} .target:hover{background-color: yellow} </style>'
  );

  doc("head").append(
    '<style> @charset "utf-8"; .PGBRK {page-break-after:always} .COVER-TITLE {TEXT-ALIGN:CENTER; color: #ff8625; FONT-FAMILY:gulim;  FONT-WEIGHT: bold; FONT-SIZE: 28px; LETTER-SPACING: -1px; line-height:28px; height:45px;} P {TEXT-ALIGN:JUSTIFY; FONT-FAMILY:gulim; FONT-SIZE:15px; COLOR:#000000; LINE-HEIGHT:24px; LETTER-SPACING:0.08em;} .P {TEXT-ALIGN:JUSTIFY; FONT-FAMILY:gulim; COLOR:#000000; LINE-HEIGHT:18px;} .P-LARGE {TEXT-ALIGN:LEFT; FONT-FAMILY:gulim; FONT-SIZE:16px; COLOR:#000000; LETTER-SPACING:0.01cm;} .P-MEDIUM {TEXT-ALIGN:LEFT; FONT-FAMILY:gulim; FONT-SIZE:14px; COLOR:#000000;} .P-SMALL {TEXT-ALIGN:LEFT; FONT-FAMILY:gulim ;FONT-SIZE:12px; COLOR:#000000;} .TABLE {TEXT-ALIGN:LEFT; FONT-FAMILY:gulim; FONT-SIZE:12px; COLOR:#666666;border-collapse:collapse; border-style:solid;border-color:black} .TH {FONT-FAMILY:gulim; FONT-SIZE:12px; COLOR:#666666; BACKGROUND-COLOR:#dddddd; LINE-HEIGHT:17px; LETTER-SPACING:-0.02cm; font-weight:bold;border-color:gray;padding:2px 4px 0px 4px;} .TH > P {FONT-FAMILY:gulim; FONT-SIZE:12px; COLOR:#000000; BACKGROUND-COLOR:#dddddd; LINE-HEIGHT:17px; LETTER-SPACING:-0.02cm; font-weight:bold;border-color:gray;padding:2px 4px 0px 4px;} .TD {FONT-FAMILY:gulim; FONT-SIZE:12px; COLOR:#666666; LINE-HEIGHT:17px;border-color:gray;padding:2px 4px 0px 4px;} .SECTION-1 {TEXT-ALIGN:CENTER;FONT-FAMILY:gulim;FONT-SIZE:20px; FONT-WEIGHT:bold; LETTER-SPACING:-1px; COLOR:#035fa3;} .SECTION-2 {TEXT-ALIGN:LEFT;FONT-FAMILY:gulim;FONT-SIZE:16px; FONT-WEIGHT:bold; LETTER-SPACING:-1px; COLOR:#038ed5;} .SECTION-3 {TEXT-ALIGN:LEFT;FONT-FAMILY:gulim;FONT-SIZE:14px; FONT-WEIGHT:bold; LETTER-SPACING:-1px; color:#333333;} .SECTION-4 {TEXT-ALIGN:LEFT;FONT-FAMILY:gulim;FONT-SIZE:14px;color:#0387cb;} .SECTION-5 {TEXT-ALIGN:LEFT;FONT-FAMILY:gulim;FONT-SIZE:12px;color:#0387cb;} .SECTION-6 {TEXT-ALIGN:LEFT;FONT-FAMILY:gulim;FONT-SIZE:12px;color:#0387cb;} .PART {TEXT-ALIGN:LEFT;FONT-FAMILY:gulim;FONT-SIZE:22px;FONT-WEIGHT:bold;COLOR:#00aaac;} .TABLE-GROUP {TEXT-ALIGN:LEFT;FONT-FAMILY:gulim;FONT-SIZE:12px;FONT-WEIGHT:bold;COLOR:#00aaac;} BODY {WIDTH:600px; FONT-FAMILY:gulim;FONT-SIZE:12px; MARGIN-LEFT:20px; scrollbar-face-color:#F6F6F6; scrollbar-highlight-color:#FFFFFF; scrollbar-3dlight-color:#D7D5D5; scrollbar-shadow-color:#dbd9d9; scrollbar-darkshadow-color:#F6F6F6; scrollbar-track-color:#F6F6F6; scrollbar-arrow-color:#666666;} .CORRECTION {TEXT-ALIGN:CENTER;FONT-FAMILY:gulim;FONT-SIZE:20px;FONT-WEIGHT:bold;COLOR:#00aaac;} .THEAD > TR > .TD {FONT-FAMILY:gulim; FONT-SIZE:12px; COLOR:#666666; BACKGROUND-COLOR:#dddddd; LINE-HEIGHT:17px; LETTER-SPACING:-0.02cm; font-weight:bold;border-color:gray;padding:2px 4px 0px 4px;} </style?'
  );

  res.send(doc.html());
});

module.exports = router;
