var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const User = require("../model/user");
const { makeUserInfo } = require("../utils/makeUserInfo");

router.get("/", makeUserInfo, async (req, res) => {
  const page = Number(req.query.page);

  const search = req.query.value || "";

  if (search.lenghth < 2 || /^[.,!?]*$/.test(search)) {
    return res.status(400).json({ error: "허용되지않는 문자입니다." });
  }

  const limit = 5;

  const start = (page - 1) * limit;

  const posts = await Post.find({
    $or: [
      { title: { $regex: search, $options: "i" } },
      { "preview.text": { $regex: search, $options: "i" } },
    ],
  })
    .populate("userId")
    .sort({ createdAt: -1 })
    .skip(start)
    .limit(5);

  const total = await Post.countDocuments({
    $or: [
      { title: { $regex: search, $options: "i" } },
      { "preview.text": { $regex: search, $options: "i" } },
    ],
  });

  const result = posts.map((ele) => {
    return {
      title: ele.title,
      _id: ele._id,
      preview: ele.preview,
      createdAt: ele.createdAt,
      writer: {
        id: ele.userId._id,
        nickname: ele.userId.nickname,
        img: ele.userId.profile,
      },
      commentCount: ele.commentCount,
      scrapingCount: ele.scrapingUsers.length,
      isScrapped: req.userId
        ? ele.scrapingUsers.some((userId) => userId.equals(req.userId))
        : false,
    };
  });

  res.json({ result: result, total: total });
});

router.get("/writer", async (req, res) => {
  const nick = req.query.value;
  const page = Number(req.query.page);

  const limit = 5;

  const start = (page - 1) * limit;

  const findnickname = await User.find({
    nickname: { $regex: nick, $options: "i" },
  })
    .skip(start)
    .limit(5);

  const total = await User.countDocuments({
    nickname: { $regex: nick, $options: "i" },
  });

  res.json({
    result: findnickname.map((elem, idx) => {
      return {
        userId: elem._id,
        profile: elem.profile,
        nickname: elem.nickname,
        comment: elem.comment,
      };
    }),
    total: total,
  });
});

module.exports = router;
