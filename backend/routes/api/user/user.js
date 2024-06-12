var express = require("express");
var router = express.Router();

const User = require("../../../model/user");
const { authenticateJWT } = require("../../../utils/authenticateJWT");

// 테스트용 코드
router.get("/", authenticateJWT, async (req, res, next) => {
  try {
    const user = req.user;

    console.log(user);

    res.status(200).json(user);
  } catch (error) {
    console.error("유저 정보 조회 에러", error);
  }
});

module.exports = router;
