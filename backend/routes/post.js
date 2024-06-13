var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const User = require("../model/user");

router.post("/", async (req, res) => {
  const userId = req.header("userId");
  const body = req.body;

  const user = await User.findOne({ userId: userId });

  if (!user) {
    res
      .status(403)
      .json("존재하지 않는 사용자 id입니다. JWT 토근을 확인해주세요.");
    return;
  }

  Post.create({
    userId: userId,
    title: body.title,
    content: body.content,
    public: body.public,
  })
    .then((data) => {
      res.status(201).json(data);
    })
    .catch((err) => {
      res.status(500).json(err);
    });
});

router.get("/", (req, res) => {
  Post.findById(req.query.postId)
    .then((data) => {
      if (!data) {
        res.status(404).json({
          msg: "존재하지 않는 postId입니다.",
        });
        return;
      }

      res.json(data);
    })
    .catch((err) => {
      res.status(500).json({
        msg: "post조회 중에 오류가 발생했습니다.",
        reason: err,
      });
    });
});

module.exports = router;
