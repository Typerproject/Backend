var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const User = require("../model/user");
const { ObjectId } = require("mongodb");
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

router.get("/", async (req, res) => {
  try {
    const post = await Post.findById(new ObjectId(req.query.postId));

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

router.patch("/scrap", authenticateJWT, async (req, res) => {
  const {_id: userId} = req.user;
  const {postId} = req.body;
  if (!postId) {
    return res.status(400).json({
      msg: "postId는 필수 입력 값입니다.",
    })
  }

  if(!userId) {
    return res.status(404).json({
      msg: "user 정보를 찾을 수 없습니다."
    })
  }

  // 이미 스크랩 된 경우 check
  const isScrappedPost = await User.find({_id: userId, scrappedPosts: postId});

  const isScrappedUser = await Post.find({_id: postId, scrapingUsers: userId});

  console.log(isScrappedPost, isScrappedUser);

  if(isScrappedPost.length !==0 || isScrappedUser.length !== 0) {
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

router.delete("/scrap/:postId", authenticateJWT, async (req, res) => {
  const {_id: userId} = req.user;
  const {postId} = req.params;

  if(!postId) {
    return res.status(400).json({
      msg: "postId는 필수 입력 값입니다.",
    })
  }

  if(!userId) {
    return res.status(404).json({
      msg: "user 정보를 찾을 수 없습니다."
    })
  }
  
  // 스크랩 안한 경우 밴
  const isNotScrappedPost = await User.find({_id: userId, scrappedPosts: postId});
  const isNotScrappedUser = await Post.find({_id: postId, scrapingUsers: userId});

  if(isNotScrappedPost.length === 0 || isNotScrappedUser.length === 0) {
    return res.status(409).json({
      msg: "스크랩하지 않은 post입니다."
    });
  }

  // 트랙잭션 시작을 위한 커넥션
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await User.updateOne(
      {_id: userId},
      {// 삭제하는 연산자
        $pullAll: {scrappedPosts: [postId]}//삭제하고자 하는 postId 지정
      },
      {session}
    );

    await Post.updateOne(
      {_id: postId},
      {
        $pullAll: {scrapingUsers: [userId]}//삭제하고 싶은 user...gk
      },
      {session}
    );

    await session.commitTransaction();
  }
  catch (err) {
    await session.abortTransaction();

    console.log("scrap remove failed : ", err);

    return res.status(500).json({
      msg: "스크랩 삭제에 실패하였습니다.",
      reason: err,
    })
  }
  finally {
    session.endSession();
  }

  return res.json({
    msg: "스크랩 삭제에 성공하였습니다.",
    postId: postId,
    userId: userId,
  });
});

module.exports = router;
