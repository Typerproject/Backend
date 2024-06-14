var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const User = require("../model/user");
const { authenticateJWT } = require("../utils/authenticateJWT");

router.post("/", authenticateJWT, async (req, res) => {
  const body = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res
      .status(403)
      .json("존재하지 않는 사용자 id입니다. JWT 토근을 확인해주세요.");
    return;
  }

  console.log(body.content);
  console.log(typeof body.content);

  Post.create({
    userId: user._id,
    title: body.title,
    content: body.content,
    public: body.public,
  })
    .then((data) => {
      res.status(201).json(data);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get("/", async (req, res) => {
  try {
    const post = await Post.findById(req.query.postId);

    if (!post) {
      res.status(404).json({
        msg: "존재하지 않는 postId 입니다.",
      });
      return;
    }

    console.log(post);
    const writer = await User.findById(post.userId);
    console.log(writer);

    res.json({
      id: post._id,
      title: post.title,
      content: post.content,
      public: post.public,
      writedAt:
        post.createdAt > post.updatedAt ? post.createAt : post.updatedAt,

      writer: {
        writerId: writer._id,
        name: writer.nickname,
        img: writer.profile,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "post불러오기 중 예외 발생",
      reason: err,
    });
  }
});

module.exports = router;
