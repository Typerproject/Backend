var express = require("express");
var router = express.Router();
const code = require("../../public/jsons/corpcode");
const axios = require("axios");

router.get("/", async function (req, res) {
  try {
    const name = req.query.company;
    const startdate = Number(req.query.startdate); // startdate를 정수로 변환합니다.
    const enddate = Number(req.query.enddate); // enddate를 정수로 변환합니다.

    const codelist = code.result.list;
    const new_code_list = codelist.filter((elem) =>
      elem.corp_name.includes(name)
    );


    if (new_code_list.length === 0) {
      return res.status(403).json({ error: "Company not found" });
    }

    const new_code = new_code_list[0].corp_code[0]; 
    console.log(new_code)
    // 배열의 첫 번째 요소에서 corp_code를 추출합니다.
    const final = [];

    for (let i = startdate; i <= enddate; i++) {
      const dart = await axios(
        `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json`,
        {
          params: {
            crtfc_key: process.env.DART_URI,
            corp_code: new_code,
            bsns_year: i,
            reprt_code: "11011",
            fs_div: "OFS",
          },
        }
        
      );

      console.log(dart.data)

      const response = dart.data;
      const list = response.list;
    

      const targetAccountNames = [
        "매출액",
        "매출원가",
        "매출총이익",
        "판매비와 관리비",
        "영업이익",
        "당기순이익",
        "영업활동 현금흐름",
        "투자활동 현금흐름",
        "재무활동 현금흐름",
        "재고자산",
        "유동부채",
        "단기차입금",
        "자본금",
        "이익잉여금",
      ];

      const regexList = targetAccountNames.map(name => new RegExp(name, 'i'));

      const new_list = list
        .filter(item => regexList.some(regex => regex.test(item.account_nm)))
        .map(elem => ({
        account_nm: elem.account_nm,
        bsns_year: elem.bsns_year,
        thstrm_amount: elem.thstrm_amount,
        }));

      final.push(...new_list); // new_list의 내용을 final 배열에 추가합니다.
    }

    res.json(final);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
