const axios = require("axios");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const User = require("../model/user");

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

const authenticateJWT = async (req, res, next) => {
  let token = req.cookies.authToken;

  console.log("authenticateJWT - token: ", token);

  try {
    const decode = jwt.verify(token, jwtSecret);

    // MongoDB에서 사용자 정보 확인
    const user = await User.findById(decode._id);

    console.log("authenticateJWT - user: ", user);

    if (user) {
      const tokenInfo = await checkTokenInfo(user.token.accessToken);

      // 20 * 60 * 1000
      if (!tokenInfo || tokenInfo.expires_in < 600) {
        try {
          // 리프레시 토큰으로 새로운 액세스 토큰 발급
          const newTokens = await refreshKakaoToken(user.token.refreshToken);

          console.log("authenticateJWT: ", newTokens);

          console.log("authenticateJWT - if user - 1: ", user);

          // 새로운 토큰 정보 업데이트
          user.token.accessToken = newTokens.access_token;
          if (newTokens.refresh_token) {
            user.token.refreshToken = newTokens.refresh_token;
          }

          console.log("authenticateJWT - if user - 2: ", user);

          await user.save();

          // 새로운 JWT 발급
          const userData = {
            _id: user._id,
            nickname: user.nickname,
            email: user.email,
            comment: user.comment,
            profile: user.profile,
          };
          const newToken = jwt.sign(userData, jwtSecret, {
            expiresIn: newTokens.expires_in * 1000,
          });

          // 쿠키 설정
          res.cookie("authToken", newToken, {
            httpOnly: true,
            maxAge: 3600000 * 2,
            // sameSite: "None",
          });

          req.user = userData; // 유저 정보를 req 객체에 저장
          next();
        } catch (refreshError) {
          // 리프레시 토큰이 유효하지 않은 경우 다시 로그인 요청
          if (refreshError.response && refreshError.response.status === 401) {
            res.status(401).json({ message: "다시 로그인해주세요." });
            return;
          }
          throw refreshError;
        }
      } else {
        // 토큰이 유효하고 새로고침이 필요 없는 경우
        // const remainingTime = decoded.exp * 1000 - Date.now();
        // res.cookie("authToken", token, {
        //   httpOnly: true,
        //   maxAge: remainingTime + 999999,
        // });

        const userData = {
          _id: user._id,
          nickname: user.nickname,
          email: user.email,
          comment: user.comment,
          profile: user.profile,
        };
        req.user = userData; // 유저 정보를 req 객체에 저장
        next();
      }
    } else {
      res.status(403).json({ message: "사용자 정보를 찾을 수 없음" }); // 사용자 정보가 없으면 403 반환
      return;
    }
  } catch (error) {
    res.status(401).json({
      message: "유효한 토큰이 아님",
      reason: error,
    });
    return;
  }

  // const authHeader = req.headers.authorization;

  // if (authHeader) {
  //   const token = authHeader.split(" ")[1];

  //   try {
  //     const decode = jwt.verify(token, jwtSecret);

  //     console.log(decode);

  //     // MongoDB에서 사용자 정보 확인
  //     const user = await User.findById(decode._id);

  //     console.log(`userCheck: ${user}`);

  //     if (user) {
  //       const tokenInfo = await checkTokenInfo(user.token.accessToken);

  //       console.log("tokenInfo: ", JSON.stringify(tokenInfo, null, 2));

  //       console.log(`토큰인포: ${tokenInfo.expires_in}`);
  //       // 액세스 토큰이 만료되었거나 만료까지 10분 이내로 남은 경우
  //       if (!tokenInfo || tokenInfo.expires_in < 600) {
  //         console.log("로직 실행 부분");

  //         try {
  //           console.log("토큰 갱신 필요");

  //           // 리프레시 토큰으로 새로운 액세스 토큰 발급
  //           const newTokens = await refreshKakaoToken(user.token.refreshToken);

  //           console.log(`newTokens: ${JSON.stringify(newTokens, null, 2)}`);

  //           // 새로운 토큰 정보 업데이트
  //           user.token.accessToken = newTokens.access_token;
  //           if (newTokens.refresh_token) {
  //             user.token.refreshToken = newTokens.refresh_token;
  //           }

  //           await user.save();

  //           // 새로운 JWT 발급
  //           const jwtPayload = {
  //             _id: user._id,
  //             nickname: user.nickname,
  //             email: user.email,
  //             comment: user.comment,
  //             profile: user.profile,
  //           };
  //           const newToken = jwt.sign(jwtPayload, jwtSecret, {
  //             expiresIn: newTokens.expires_in * 1000,
  //           });

  //           // 기존의 토큰과 새로운 토큰을 함께 반환
  //           res.setHeader("Authorization", `Bearer ${newToken}`);

  //           req.user = jwtPayload; // 유저 정보를 req 객체에 저장
  //           next();
  //         } catch (refreshError) {
  //           // 리프레시 토큰이 유효하지 않은 경우 다시 로그인 요청
  //           if (refreshError.response && refreshError.response.status === 401) {
  //             return res.status(401).json({ message: "다시 로그인해주세요." });
  //           }
  //           throw refreshError;
  //         }
  //       } else {
  //         // 잘 남아 있을 경우
  //         res.setHeader("Authorization", `Bearer ${token}`);
  //       }

  //       const jwtPayload = {
  //         _id: user._id,
  //         nickname: user.nickname,
  //         email: user.email,
  //         comment: user.comment,
  //         profile: user.profile,
  //       };

  //       req.user = jwtPayload; // 유저 정보를 req 객체에 저장
  //       next();
  //     } else {
  //       res.sendStatus(403).json({message: "사용자 정보를 찾을 수 없음"}); // 사용자 정보가 없으면 403 반환
  //     }
  //   } catch (error) {
  //     return res.sendStatus(401).json({message: "유효한 토큰이 아님"});
  //   }
  // }
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

    return tokenResponse.data;
  } catch (error) {
    console.error("authenticateJWT: ", error);
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
          client_secret: "4IsclEOfsPx01SgLLG0kladn1x1Un260",
        },
      }
    );

    console.log(response.data);

    return response.data; // { access_token, expires_in, refresh_token, refresh_token_expires_in, ... }
  } catch (error) {
    console.error("authenticateJWT - 카카오 토큰 갱신 오류:", error);
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

    console.log("tokenStatus", tokenStatus.data);

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

const kakaoLogout = async (accessToken) => {
  try {
    const userId = await axios.post(
      "https://kapi.kakao.com/v1/user/logout",
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("authenticateJWT - logout - id: ", userId.data.id);

    if (!userId) {
      console.log("authenticateJWT - logout - id - X");
      return;
    }

    return userId.data.id;
  } catch (error) {
    console.log("authenticateJWT - logout: ", error);
    throw new Error("로그아웃 실패다 ㅜㅜ");
  }
};

module.exports = {
  getKakaoToken,
  refreshKakaoToken,
  checkTokenInfo,
  authenticateJWT,
  kakaoLogout,
};
