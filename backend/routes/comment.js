const express = require("express");
const router = express.Router();
const { Comment, Reply } = require("../model/comment");
const { authenticateJWT } = require("../utils/authenticateJWT");
const mongoose = require("mongoose");
const Post = require("../model/post");
const { ObjectId } = require("mongodb");

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

  try {
    // comment create 하는 코드
    const response = await Comment.create({
      postId: postId,
      writerId: userId,
      text: text,
    });

    return res.status(201).json({
      response,
    });
  } catch (error) {
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

  try {
    const response = await Reply.create({
      postId: postId,
      writerId: userId,
      text: text,
      parentCommentId: parentCommentId,
    });

    res.status(201).json({
      response,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      msg: "comment/reply post 오류 발생",
      reason: error,
    });
  }
});

// 댓글 삭제
router.delete("/:commentId", authenticateJWT, async (req, res) => {
  const commentId = req.params.commentId;

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

  //확인
  try {
    let response;
    if (comment) {
      //대댓글이 없는 코멘트 -> 삭제
      //대댓글이 있는 코멘트 -> isDeleted true로 변경
      replies = await Reply.find({ parentCommentId: commentId });

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
      }
    } else if (reply) {
      response = await Reply.deleteOne({
        _id: commentId,
      });
    }

    return res.status(202).json({
      msg: "comment 삭제 성공",
      // response
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      msg: "comment delete 에러",
      reason: error,
    });
  }
});

module.exports = router;
