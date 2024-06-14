var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const User = require("../model/user");
const { authenticateJWT } = require("../utils/authenticateJWT");
const mongoose = require("mongoose");

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

router.post("/scrap", authenticateJWT, async (req, res) => {
  // console.log(req.user);
  // console.log(req.body);

  const {_id: userId} = req.user;
  const {postId} = req.body;
  if (!postId) {
    return res.status(400).json({
      msg: "postId는 필수 입력 값입니다.",
    })
  }

  if(!userId) {
    return res.status(404).json({
      msg: "user 정보를 찾을 수 있습니다."
    })
  }

  // 이미 스크랩 된 경우 check
  const isScrappedPost = await User.find({_id: userId, scrappedPosts: postId});

  const isScrappedUser = await Post.find({_id: postId, scrapingUsers: userId});

  if(isScrappedPost || isScrappedUser) {
    return res.status(409).json({
      msg: "이미 스크랩된 post입니다."
    })
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction(); 

    await User.updateOne(
      {_id: userId}, 
      { //userId로 찾기
      $addToSet: {//배열 필드에 값을 추가할 때 사용하는 연산자
        scrappedPosts: postId //scrappedPosts에 postId 추가
        }
      }, 
      {session}
    );//아까 시작한 트랜잭션 세션

    await Post.updateOne(
      {_id: postId},
      {
        $addToSet: {
          scrapingUsers: userId
        }
      },
      {session}
    );

    await session.commitTransaction();// 성공 시 커밋
  } 
  catch (err) {
    await session.abortTransaction();

    console.log("scrap failed : ", err);

    return res.status(500).json({
      msg: "스크랩에 실패하였습니다.",
      reason: err,
    })
  } 
  finally {
    session.endSession();
  }

  return res.json({
    msg: "스크랩에 성공하였습니다.",
    postId: postId,
    userId: userId,
  });
});

module.exports = router;
