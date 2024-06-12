const axios = require("axios");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../model/user");

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    try {
      const decode = jwt.verify(token, jwtSecret);

      // MongoDB에서 사용자 정보 확인
      const user = await User.findOne({ userId: decode.userId });

      if (user) {
        const tokenInfo = await checkTokenInfo(user.token.accessToken);

        // 액세스 토큰이 만료되었거나 만료까지 10분 이내로 남은 경우
        if (!tokenInfo || tokenInfo.expires_in < 600) {
          try {
            // 리프레시 토큰으로 새로운 액세스 토큰 발급
            const newTokens = await refreshKakaoToken(user.token.refreshToken);

            // 새로운 토큰 정보 업데이트
            user.token.accessToken = newTokens.access_token;
            user.token.accessTokenExpiresAt = new Date(
              Date.now() + newTokens.expires_in * 1000
            );
            if (newTokens.refresh_token) {
              user.token.refreshToken = newTokens.refresh_token;
              user.token.refreshTokenExpiresAt = new Date(
                Date.now() + newTokens.refresh_token_expires_in * 1000
              );
            }

            await user.save();
          } catch (refreshError) {
            // 리프레시 토큰이 유효하지 않은 경우 다시 로그인 요청
            if (refreshError.response && refreshError.response.status === 401) {
              return res.status(401).json({ message: "다시 로그인해주세요." });
            }
            throw refreshError;
          }
        }

        // 새로운 JWT 발급
        const jwtPayload = {
          userId: user.userId,
          nickname: user.nickname,
        };
        const newToken = jwt.sign(jwtPayload, jwtSecret, {
          expiresIn: user.token.accessTokenExpiresAt,
        });

        // 기존의 토큰과 새로운 토큰을 함께 반환
        res.setHeader("Authorization", `Bearer ${newToken}`);

        req.user = jwtPayload; // 유저 정보를 req 객체에 저장
        next();
      } else {
        res.sendStatus(403); // 사용자 정보가 없으면 403 반환
      }
    } catch (error) {
      return res.sendStatus(403);
    }
  }
};

// 토큰 가져오기 메서드
const getKakaoToken = async (code) => {
  const REST_API_KEY = process.env.KAKAO_CLIENT_ID;
  const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;

  try {
    const tokenResponse = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        headers: {
          "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        params: {
          grant_type: "authorization_code",
          client_id: REST_API_KEY,
          redirect_uri: REDIRECT_URI,
          code: code,
        },
      }
    );

    console.log(`토큰: ${tokenResponse}`);

    return tokenResponse.data;
  } catch (error) {
    console.error(error);
    throw new Error("토큰 가져오기 실패");
  }
};

// 토큰 갱신 로직
const refreshKakaoToken = async (refreshToken) => {
  const REST_API_KEY = process.env.KAKAO_CLIENT_ID;
  try {
    const response = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        headers: {
          "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        params: {
          grant_type: "refresh_token",
          client_id: REST_API_KEY,
          refresh_token: refreshToken,
        },
      }
    );

    return response.data; // { access_token, expires_in, refresh_token, refresh_token_expires_in, ... }
  } catch (error) {
    console.error("카카오 토큰 갱신 오류:", error);
    throw new Error("토큰 갱신 실패");
  }
};

// 토큰 정보 보기
const checkTokenInfo = async (accessToken) => {
  try {
    const tokenStatus = await axios.get(
      "https://kapi.kakao.com/v1/user/access_token_info",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("tokenStatus" + tokenStatus.data);

    return tokenStatus.data;
  } catch (error) {
    if (error.response.status === 401) {
      console.log("토큰이 만료되었습니다.");
      return false;
    } else {
      console.error(
        "토큰 정보 보기 실패:",
        error.response?.data || error.message
      );
    }
    throw new Error("토큰 정보 보기 실패");
  }
};

module.exports = {
  getKakaoToken,
  refreshKakaoToken,
  checkTokenInfo,
  authenticateJWT,
};
