var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const User = require("../model/user");
const Follower = require("../model/follower");
const { ObjectId } = require("mongodb");
const { authenticateJWT } = require("../utils/authenticateJWT");
const mongoose = require("mongoose");
const { makeUserInfo } = require("../utils/makeUserInfo");

router.get("/list", makeUserInfo, async (req, res) => {
  try {
    const perPage = 10;
    const currentPage = req.query.page || 1;

    const query = {};
    const sort = { createdAt: -1 };

    if (req.userId) {
      if (req.query.type) {
        if (req.query.type === "follow") {
          const follow = await Follower.findOne({ userId: req.userId });
          query.userId = { $in: follow.following_userId };
        }
      }
    }

    let result;

    if (req.query.type === "hot") {
      result = await Post.aggregate([
        {
          $addFields: {
            scrapingUsersCount: { $size: "$scrapingUsers" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userId",
          },
        },
        {
          $match: {
            scrapingUsersCount: { $gt: 0 },
          },
        },
        {
          $sort: {
            scrapingUsersCount: -1,
          },
        },
        {
          $limit: perPage,
        },
        {
          $skip: (currentPage - 1) * perPage,
        },
      ]);

      result = result.map((ele) => {
        ele.userId = ele.userId[0];
        return ele;
      });
    } else {
      result = await Post.find(query)
        .populate("userId")
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .sort(sort);
    }

    res.json(
      result.map((ele, idx) => {
        return {
          title: ele.title,
          _id: ele._id,
          preview: ele.preview,
          createdAt: ele.createdAt,
          public: ele.public,
          writer: {
            id: ele.userId._id,
            name: ele.userId.nickname,
            img: ele.userId.profile,
          },
          scrapingCount: ele.scrapingUsers.length,
          isScrapped: req.userId
            ? ele.scrapingUsers.some((userId) => userId.equals(req.userId))
            : false,
        };
      })
    );
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "post/list 에러 발생",
      reason: err,
    });
  }
});

router.post("/", authenticateJWT, async (req, res) => {
  const body = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res
      .status(403)
      .json("존재하지 않는 사용자 id입니다. JWT 토근을 확인해주세요.");
    return;
  }

  const prevText = body.content.blocks.reduce((acc, cur, idx) => {
    if (cur.type === "paragraph") {
      return acc + " " + cur.data.text;
    }
    return acc;
  }, "");

  const prevImg = body.content.blocks.find((item) => {
    item.type === "img";
  });

  Post.create({
    userId: user._id,
    title: body.title,
    content: body.content,
    public: body.public,
    preview: {
      text: prevText,
      img: prevImg?.data.url,
    },
  })
    .then((data) => {
      res.status(201).json(data);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get("/:postId", makeUserInfo, async (req, res) => {
  try {
    const post = await Post.findById(new ObjectId(req.params.postId));

    if (!post) {
      res.status(404).json({
        msg: "존재하지 않는 postId 입니다.",
      });
      return;
    }

    const writer = await User.findById(post.userId);
    let isScrapped;
    if (req.userId) {
      isScrapped = post.scrapingUsers.includes(new ObjectId(req.userId));
    } else {
      isScrapped = false;
    }

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
      isScrapped: isScrapped,
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
  const { _id: userId } = req.user;
  const { postId } = req.body;
  if (!postId) {
    return res.status(400).json({
      msg: "postId는 필수 입력 값입니다.",
    });
  }

  if (!userId) {
    return res.status(404).json({
      msg: "user 정보를 찾을 수 없습니다.",
    });
  }

  // 이미 스크랩 된 경우 check
  const isScrappedPost = await User.find({
    _id: userId,
    scrappedPosts: postId,
  });

  const isScrappedUser = await Post.find({
    _id: postId,
    scrapingUsers: userId,
  });

  console.log(isScrappedPost, isScrappedUser);

  if (isScrappedPost.length !== 0 || isScrappedUser.length !== 0) {
    return res.status(409).json({
      msg: "이미 스크랩된 post입니다.",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await User.updateOne(
      { _id: userId },
      {
        //userId로 찾기
        $addToSet: {
          //배열 필드에 값을 추가할 때 사용하는 연산자
          scrappedPosts: postId, //scrappedPosts에 postId 추가
        },
      },
      { session }
    ); //아까 시작한 트랜잭션 세션

    await Post.updateOne(
      { _id: postId },
      {
        $addToSet: {
          scrapingUsers: userId,
        },
      },
      { session }
    );

    await session.commitTransaction(); // 성공 시 커밋
  } catch (err) {
    await session.abortTransaction();

    console.log("scrap failed : ", err);

    return res.status(500).json({
      msg: "스크랩에 실패하였습니다.",
      reason: err,
    });
  } finally {
    session.endSession();
  }

  return res.json({
    msg: "스크랩에 성공하였습니다.",
    postId: postId,
    userId: userId,
  });
});

router.delete("/scrap/:postId", authenticateJWT, async (req, res) => {
  const { _id: userId } = req.user;
  const { postId } = req.params;

  if (!postId) {
    return res.status(400).json({
      msg: "postId는 필수 입력 값입니다.",
    });
  }

  if (!userId) {
    return res.status(404).json({
      msg: "user 정보를 찾을 수 없습니다.",
    });
  }

  // 스크랩 안한 경우 밴
  const isNotScrappedPost = await User.find({
    _id: userId,
    scrappedPosts: postId,
  });
  const isNotScrappedUser = await Post.find({
    _id: postId,
    scrapingUsers: userId,
  });

  if (isNotScrappedPost.length === 0 || isNotScrappedUser.length === 0) {
    return res.status(409).json({
      msg: "스크랩하지 않은 post입니다.",
    });
  }

  // 트랙잭션 시작을 위한 커넥션
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await User.updateOne(
      { _id: userId },
      {
        // 삭제하는 연산자
        $pullAll: { scrappedPosts: [postId] }, //삭제하고자 하는 postId 지정
      },
      { session }
    );

    await Post.updateOne(
      { _id: postId },
      {
        $pullAll: { scrapingUsers: [userId] }, //삭제하고 싶은 user...gk
      },
      { session }
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();

    console.log("scrap remove failed : ", err);

    return res.status(500).json({
      msg: "스크랩 삭제에 실패하였습니다.",
      reason: err,
    });
  } finally {
    session.endSession();
  }

  return res.json({
    msg: "스크랩 삭제에 성공하였습니다.",
    postId: postId,
    userId: userId,
  });
});

router.get("/scrap/list", authenticateJWT, async (req, res) => {
  const { _id: userId } = req.user;

  if (!userId) {
    return res.status(404).json({
      msg: "user 정보를 찾을 수 없습니다.",
    });
  }

  const scrapList = await User.findOne({
    _id: userId,
  })
    .populate({
      path: "scrappedPosts",
      select: "_id userId title updatedAt preview",
      populate: {
        path: "userId",
        select: "_id nickname profile",
      },
    })
    .lean();
  console.log(scrapList.scrappedPosts);

  if (scrapList.scrappedPosts.length === 0) {
    return res.status(200).json({
      msg: "스크랩한 post가 없습니다.", //없다고 메세지로 알려주고 싶음
      scrappedPosts: [],
    });
  }

  //userId -> writer로 변경
  if (scrapList.scrappedPosts) {
    scrapList.scrappedPosts = scrapList.scrappedPosts.map((post) => {
      post.writer = post.userId;
      delete post.userId;
      return post;
    });
  }

  return res.status(200).json({
    scrappedPosts: scrapList.scrappedPosts,
  });
});

module.exports = router;
