const { default: axios } = require("axios");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
var express = require("express");
var router = express.Router();

dotenv.config();

const User = require("../../model/user");
const {
  getKakaoToken,
  authenticateJWT,
} = require("../../utils/authenticateJWT");

const jwtSecret = process.env.JWT_SECRET;

// 로그인
router.post("/", async (req, res) => {
  const { code } = req.body;

  console.log("code: " + code);

  // 토큰 발급
  if (!code) {
    return res.status(400).send("인가 코드가 필요합니다!");
  }

  try {
    const tokens = await getKakaoToken(code);

    //유저 정보 요청
    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    //사용자의 닉넴
    const user = userResponse.data;

    const existingUser = await User.findOne({ userId: user.id });

    if (!existingUser) {
      const newUser = await User.enroll(
        user.id,
        user.properties.nickname,
        user.kakao_account.email,
        user.properties.profile_image,
        tokens.access_token,
        tokens.refresh_token
      );

      const jwtPayload = {
        _id: newUser._id,
        nickname: newUser.nickname,
        email: newUser.email,
        comment: newUser.comment,
        profile: newUser.profile,
      };

      const jwtToken = jwt.sign(jwtPayload, jwtSecret, {
        expiresIn: tokens.expires_in,
      });

      res.status(201).json({
        user: jwtPayload,
        token: jwtToken,
      });
    } else {
      // 기존 유저가 있으면 토큰 갱신
      existingUser.token.accessToken = tokens.access_token;
      existingUser.token.refreshToken = tokens.refresh_token;

      await existingUser.save();

      // JWT 생성
      const jwtPayload = {
        _id: existingUser._id,
        nickname: existingUser.nickname,
        email: existingUser.email,
        comment: existingUser.comment,
        profile: existingUser.profile,
      };
      const jwtToken = jwt.sign(jwtPayload, jwtSecret, {
        expiresIn: tokens.expires_in,
      });

      res.status(200).json({
        user: jwtPayload,
        token: jwtToken,
      });
    }
  } catch (error) {
    console.error("Error enrolling user:", error);
    res.status(500).send("서버 오류");
  }
});

router.post("/logout", async (req, res) => {
  try {
    res.status(200).send("ㄷㄷㄷㄷ");
  } catch (error) {
    console.error("에러 발생 씨바아아알", error);
  }
});

module.exports = router;
