const express = require("express");
const router = express.Router();
const { newsCrawler } = require("../../utils/newsCrawler");
const validUrl = require('valid-url');

router.post("/", async function (req, res) {
  try {
    const { url } = req.body;
    // console.log(url);

    if (!validUrl.isWebUri(url)) {
      return res.status(400).json({
        message: "잘못된 url 형식입니다.",
      });
    }

    const data = await newsCrawler(url);
    // console.log(data);

    return res.status(200).json({
      data,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "server error",
    });
  }
});

module.exports = router;
