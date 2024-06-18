const axios = require("axios");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const User = require("../model/user");

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

const makeUserInfo = async (req, res, next) => {
  let token = req.cookies.authToken;

  if (!token) {
    next();
    return;
  }
  const decode = jwt.verify(token, jwtSecret);
  const user = await User.findById(decode._id);

  if (user) {
    req.userId = user._id; // 유저 정보를 req 객체에 저장
    next();
  } else {
    res.status(403).json({ message: "사용자 정보를 찾을 수 없음" }); // 사용자 정보가 없으면 403 반환
    return;
  }
};

module.exports = { makeUserInfo };
