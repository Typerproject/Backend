const express = require("express");
const router = express.Router();
const axios = require("axios");
const dotenv = require("dotenv");
const { getAccessToken } = require("../../utils/stockAuth");

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

    res.status(200).json(apiResp);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
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

module.exports = router;
