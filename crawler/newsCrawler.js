const axios = require("axios");
const cheerio = require('cheerio');

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Connection: "keep-alive",
};

async function newsCrawler(newsUrl) {
  const response = await axios.get(`${newsUrl}`, {
    headers: headers,
  });

  const html = response.data;
  const $ = cheerio.load(html);

  const extractedTitle =
    $('meta[name="title"]').attr("content") ||
    $("title").text() ||
    $('meta[property="og:title"]').attr("content");

  const extractedImgUrl = $('meta[property="og:image"]').attr("content");
  const detail =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content");

    return {
        newsUrl,
        title: extractedTitle,
        imgUrl: extractedImgUrl,
        detail,
    }
}

module.exports = {newsCrawler};