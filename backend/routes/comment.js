const express = require("express");
const router = express.Router();
const { Comment, Reply } = require("../model/comment");
const { authenticateJWT } = require("../utils/authenticateJWT");
const mongoose = require("mongoose");
const Post = require("../model/post");
const { ObjectId } = require("mongodb");

router.get("/:postId", async (req, res) => {
  try {
    const target = await Post.findById(req.params.postId);

    if (!target) {
      res.status(404).json({ msg: "존재하지 않는 postId" });
      return;
    }

    res.json(
      (comments = await Comment.find({
        postId: req.params.postId,
        isDeleted: false,
      }).populate([
        {
          path: "replies",
          populate: {
            path: "writerId",
            name: "writer",
            select: "nickname profile",
          },
        },
        { path: "writerId", name: "writer", select: "nickname profile" },
      ]))
    );
  } catch (err) {
    res.status(404).json({
      reason: err,
    });
  }
});

// 댓글 쓰기
router.post("/", authenticateJWT, async (req, res) => {
  //writerId <- req.user
  const { text, postId } = req.body;
  const { _id: userId } = req.user;

  if (!text || !postId) {
    return res.status(400).json({
      msg: "text, postId는 필수 입력 값입니다.",
    });
  }

  // 진짜 있는 post인지 확인
  const post = await Post.findById(postId);
  //   console.log('post', post);
  if (!post) {
    return res.status(404).json({
      msg: "post를 찾을 수 없습니다.",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // comment create 하는 코드
    const response = await Comment.create({
      postId: postId,
      writerId: userId,
      text: text,
    });

    post.commentCount += 1;
    post.save();
    await session.commitTransaction(); //성공 시 커밋 완료 ~
    return res.status(201).json({
      response,
    });
  } catch (error) {
    session.abortTransaction();
    console.log(error);
    return res.status(500).json({
      msg: "comment post 에러 발생",
      reason: error,
    });
  }
});

router.post("/reply", authenticateJWT, async (req, res) => {
  const { text, postId, parentCommentId } = req.body;
  const { _id: userId } = req.user;

  if (!text || !postId || !parentCommentId) {
    return res.status(400).json({
      msg: "text, postId, parentCommentId는 필수 입력 값입니다.",
    });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({
      msg: "post를 찾을 수 없습니다.",
    });
  }

  const parentComment = await Comment.findById(parentCommentId);
  if (!parentComment) {
    return res.status(404).json({
      msg: "parentComment를 찾을 수 없습니다.",
    });
  }

  let response;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    response = await Reply.create({
      postId: postId,
      writerId: userId,
      text: text,
      parentCommentId: parentCommentId,
    });

    await Comment.updateOne(
      { _id: parentCommentId },
      {
        $addToSet: {
          replies: response._id,
        },
      }
    );

    post.commentCount += 1;
    post.save();

    await session.commitTransaction(); //성공 시 커밋 완료 ~
  } catch (error) {
    console.log(error);

    await session.abortTransaction();

    return res.status(500).json({
      msg: "comment/reply post 오류 발생",
      reason: error,
    });
  } finally {
    session.endSession();
  }

  return res.status(201).json({
    response,
    msg: "대댓글 달기 성공",
  });
});

// 댓글 삭제
router.delete("/:commentId", authenticateJWT, async (req, res) => {
  console.log(req.params.commentId);
  const commentId = new ObjectId(req.params.commentId);

  if (!commentId) {
    return res.status(400).json({
      msg: "commentId는 필수 입력 값입니다.",
    });
  }

  const comment = await Comment.findById(commentId);
  const reply = await Reply.findById(commentId);

  if (!comment && !reply) {
    console.log(!comment && !reply);
    console.log(comment);
    console.log(reply);
    return res.status(404).json({
      msg: "comment를 찾을 수 없습니다.",
    });
  }

  const post = await Post.findById(comment ? comment.postId : reply.postId);

  const session = await mongoose.startSession();

  //확인
  try {
    session.startTransaction();

    let response;
    if (comment) {
      //대댓글이 없는 코멘트 -> 삭제
      //대댓글이 있는 코멘트 -> isDeleted true로 변경
      replies = await Reply.find({ parentCommentId: commentId });

      post.commentCount -= 1;

      if (replies.length === 0) {
        response = await Comment.deleteOne({ _id: commentId });
      } else {
        response = await Comment.updateOne(
          {
            _id: commentId,
          },
          {
            isDeleted: true,
          }
        );
        post.commentCount -= replies.length;
      }
    } else if (reply) {
      //부모 코멘트 배열에서 먼저 삭제

      const { parentCommentId } = await Reply.findOne(
        { _id: commentId },
        { parentCommentId: 1 } //부모 코멘트 아이디 알아내기
      );

      console.log("commentId", parentCommentId);

      await Comment.updateOne(
        { _id: parentCommentId },
        {
          $pullAll: { replies: [commentId] }, // reply의 _id 배열에서 삭제
        },
        { session }
      );

      await Reply.deleteOne({
        //대댓글 지우기
        _id: commentId,
      });

      post.commentCount -= 1;
    }

    post.save();

    await session.commitTransaction(); // 성공 시 커밋
  } catch (error) {
    await session.abortTransaction();

    console.log(error);

    return res.status(500).json({
      msg: "comment delete 에러",
      reason: error,
    });
  } finally {
    session.endSession();
  }

  return res.status(200).json({
    msg: "comment 삭제 성공",
    // response
  });
});

module.exports = router;
