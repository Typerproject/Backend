const express = require("express");
const router = express.Router();
const axios = require("axios");
const dotenv = require("dotenv");
const { getAccessToken } = require("../../utils/stockAuth");
const fs = require("fs");
const path = require("path");
const csvParse = require("csv-parser");
const iconv = require("iconv-lite");

dotenv.config();

router.get("/", async (req, res) => {
  const { marketCode, stockCode, startDate, endDate, period, prc } = req.query;

  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);

  try {
    const apiResp = await getStock({
      marketCode,
      stockCode,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      period,
      prc,
    });
    console.log("성공!");

    res.status(200).json({
      stockTitle: apiResp.output1.hts_kor_isnm,
      data: apiResp.output2.map((ele) => {
        return {
          open: ele.stck_oprc,
          high: ele.stck_hgpr,
          low: ele.stck_lwpr,
          close: ele.stck_clpr,
          date: ele.stck_bsop_date,
        };
      }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
});

router.get("/code", async (req, res) => {
  try {
    const codeList = await getCodeList();

    res.status(200).json({
      codeList: codeList,
    });
  } catch (error) {
    console.error("종목 코드 리스트 에러", error);
    res.status(500).send("종목 코드 리스트 에러");
  }
});

function formatDate(dateStr) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(5, 7);
  const day = dateStr.substring(8, 10);
  return `${year}${month}${day}`;
}

async function getStock({
  marketCode,
  stockCode,
  startDate,
  endDate,
  period,
  prc,
}) {
  const url = `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`;
  const appKey = process.env.APP_KEY;

  const token = await getAccessToken();

  console.log(`hankookToken: ${token}`);

  const appSecret = process.env.APP_SECRET;
  const header = {
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: "FHKST03010100",
    },
    params: {
      FID_COND_MRKT_DIV_CODE: marketCode,
      FID_INPUT_ISCD: stockCode,
      FID_INPUT_DATE_1: startDate,
      FID_INPUT_DATE_2: endDate,
      FID_PERIOD_DIV_CODE: period,
      FID_ORG_ADJ_PRC: prc,
    },
  };

  try {
    const resp = await axios.get(url, header);
    console.log(resp.data);
    return resp.data;
  } catch (error) {
    console.error(error);
  }
}

async function getCodeList() {
  const csvFilePath = path.join(
    __dirname,
    "../../public/csv/data_20240623.csv"
  );

  return new Promise((resolve, reject) => {
    const records = [];

    // CSV 파일을 스트림으로 읽기
    fs.createReadStream(csvFilePath)
      .pipe(iconv.decodeStream("euc-kr"))
      .pipe(csvParse()) // CSV 파서 설정
      .on("data", (data) => {
        records.push(data);
      })
      .on("end", () => {
        // 모든 데이터를 처리한 후 선택적으로 필드 추출
        const selectedData = records.map((record) => ({
          code: record["종목코드"],
          name: record["종목명"],
        }));
        resolve(selectedData); // 선택된 데이터를 반환하기 위해 Promise를 해결(resolve)
      })
      .on("error", (error) => {
        console.error("에러 발생:", error);
        reject(error); // 오류가 발생할 경우 Promise를 거부(reject)
      });
  });
}

module.exports = router;
