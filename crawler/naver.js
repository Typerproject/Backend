const cheerio = require("cheerio");
const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");

const jaemu = [];

const hi = async () => {
  const response = await axios.get("https://www.ktb.co.kr/trading/popup/itemPop.jspx");
  const data = response.data;
  const $ = cheerio.load(data);

  const code = [];

  $(".tbody_content>tr>td:nth-child(1)").each(function () {
    code.push($(this).text());
  });

  return code;
};

const jusik = async () => {
    const jusikcode = await hi();  // Assuming hi() returns an array of stock codes
    const jaemu = [];  // 결과를 저장할 배열

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (const jusik of jusikcode) {
        const url = `https://m.stock.naver.com/domestic/stock/${jusik}/finance/quarter`;

        try {
            // 웹 페이지로 이동합니다.
            await page.goto(url, { waitUntil: 'networkidle2' });
            // 페이지의 HTML을 가져옵니다.
            const html = await page.content();
            // cheerio를 사용하여 HTML을 로드합니다.
            const $ = cheerio.load(html);
            // 결과를 저장할 객체를 초기화합니다.
            const result = {};
            // 'tr' 태그를 순회합니다.
            $("tr").each((index, element) => {
                // 'th'와 'td' 요소를 추출합니다.
                const keyElement = $(element).find("th .TableFixed_text__3qeqo");
                const valueElements = $(element).find("td.TableFixed_td__3qPDH");
                // 키가 존재하면, 값 배열을 추출합니다.
                if (keyElement.length > 0) {
                    const key = keyElement.text().trim();
                    const values = [];
                    valueElements.each((i, td) => {
                        values.push($(td).text().trim());
                    });
                    // 결과 객체에 키-값 쌍을 추가합니다.
                    result[key] = values;
                }
            });

            // 주식 이름을 가져옵니다.
            const titleElement = $(".GraphMain_name__1v8r-");  // 주식 이름의 올바른 선택자 확인
            const title = titleElement.length > 0 ? titleElement.text().trim() : 'Unknown';
            console.log(`Title found for ${jusik}: ${title}`);  // Title 확인을 위한 로그 추가

            // 기업명을 포함한 객체를 생성합니다.
            const data = { '기업': title, ...result };
            // 결과 배열에 추가합니다.
            jaemu.push(data);

        } catch (error) {
            console.error(`Error processing ${jusik}:`, error);
        }
    }

    await browser.close();
    fs.writeFileSync('jaemu.json', JSON.stringify(jaemu, null, 2));  // 최종 결과 출력
}
jusik();
