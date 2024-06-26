var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const { Comment, Reply } = require("../model/comment");
const User = require("../model/user");
const Follower = require("../model/follower");
const { ObjectId } = require("mongodb");
const { authenticateJWT } = require("../utils/authenticateJWT");
const mongoose = require("mongoose");
const { makeUserInfo } = require("../utils/makeUserInfo");
const parser = require("node-html-parser");

router.get("/random", async (req, res) => {
  try {
    const randomPosts = await Post.aggregate([
      { $sample: { size: 10 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "writer",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          preview: 1,
          userId: 1,
          writer: {
            $arrayElemAt: [
              {
                $map: {
                  input: "$writer",
                  as: "w",
                  in: {
                    nickname: "$$w.nickname",
                    profile: "$$w.profile",
                  },
                },
              },
              0,
            ],
          },
        },
      },
    ]);

    return res.status(200).json({ randomPosts });
  } catch (error) {
    res.status(500).json({ message: "random api 에러", error: error });
  }
});

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

    if (req.query.type === "follow" && !req.userId) {
      res.status(401).json({
        msg: "팔로우한 사람의 포스트를 보려면 로그인이 필요합니다.",
      });
      return;
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
            nickname: ele.userId.nickname,
            img: ele.userId.profile,
          },
          commentCount: ele.commentCount,
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

  let prevText = "";

  for (const block of body.content.blocks) {
    if (block.type === "paragraph") {
      let dom = parser.parse(block.data.text);
      prevText += " " + dom.textContent;
    }

    if (prevText.length >= 100) {
      break;
    }
  }

  const prevImg = body.content.blocks.find((item) => {
    return item.type === "image";
  });

  console.log(prevImg);

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
      writedAt: post.createdAt,
      writer: {
        writerId: writer._id,
        name: writer.nickname,
        img: writer.profile,
      },
      isScrapped: isScrapped,
      scrapingCount: post.scrapingUsers.length,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "post불러오기 중 예외 발생",
      reason: err,
    });
  }
});

router.delete("/:postId", authenticateJWT, async (req, res) => {
  const { _id: userId } = req.user;
  const postId = req.params.postId;
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

  const targetPost = await Post.findById(postId);

  if (targetPost.userId.toString() !== userId.toString()) {
    res.status(401).json({
      msg: `포스트 삭제는 직접 작성한 유저만 가능합니다. 현재 유저: ${
        userId.toString
      }   포스트 유저: ${targetPost.userId.toString()}`,
    });
    return;
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const updateRes = await User.updateMany(
      { _id: { $in: targetPost.scrapingUsers } },
      { $pull: { scrappedPosts: { $in: [targetPost._id] } } }
    );

    console.log(updateRes);

    const result = await Post.deleteOne({ _id: postId });

    if (result.deletedCount === 1) {
      await Comment.deleteMany({ postId: postId });
      await Reply.deleteMany({ postId: postId });

      await session.commitTransaction(); // 성공 시 커밋

      res.json({
        msg: "포스트 삭제 완료",
        body: result,
      });
      return;
    }
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({
      msg: "포스트 삭제 실패",
      body: result,
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

  // perPage -> 10
  // page query를 받아서 (디폴트는 1) 페이지네이션
  // 최근에 스크랩 한 순서대로 응답을 주고 싶으므로 한번 뒤집기 필요

  const perPage = 10;
  const currentPage = req.query.page || 1;

  const scrapList2 = await User.aggregate([
    {
      $match: {
        _id: userId,
      },
    },
    {
      $project: {
        scrappedPosts: { $reverseArray: "$scrappedPosts" },
      },
    },
    {
      $project: {
        scrappedPosts: {
          $slice: ["$scrappedPosts", (currentPage - 1) * perPage, perPage],
        },
      },
    },
  ]);

  if (scrapList2[0].scrappedPosts.length === 0) {
    return res.status(200).json({
      msg: "스크랩한 post가 없습니다.", //없다고 메세지로 알려주고 싶음
      scrappedPosts: [],
    });
  }

  let scrappedPostsList = [];

  const fetchScrappedPosts = async () => {
    const promises = scrapList2[0].scrappedPosts.map((post) =>
      Post.findOne({ _id: post })
        .select("_id userId title updatedAt preview scrapingUsers commentCount")
        .populate({ path: "userId", select: "_id nickname profile" })
        .lean()
        .then((res) => res)
    );

    scrappedPostsList = await Promise.all(promises);
  };

  await fetchScrappedPosts();

  //userId -> writer, scrapingUsers -> scrapCount로 변경
  if (scrappedPostsList) {
    scrappedPostsList = scrappedPostsList
      .filter((post) => post !== null)
      .map((post) => {
        post.writer = post.userId;
        post.scrapingCount = post.scrapingUsers.length;
        delete post.userId;
        delete post.scrapingUsers;
        // console.log(post);
        return post;
      });
  }

  return res.status(200).json({
    scrappedPosts: scrappedPostsList,
  });
});

// post 내용 수정 ~
router.patch("/:postId", authenticateJWT, async (req, res) => {
  const { _id: userId } = req.user;
  const { postId } = req.params;
  // const { content } = req.body;
  const body = req.body;

  if (!postId) {
    return res.status(400).json({
      msg: "postId는 필수 입력 값입니다.",
    });
  }

  // writer랑 user id가 같은지도 화긴
  const { userId: writerId } = await Post.findById(postId);

  if (!writerId.equals(userId)) {
    return res.status(403).json({
      msg: "post의 writer만 내용을 수정할 수 있습니다.",
    });
  }

  // block이 blockSchema 형식에 맞는지 check.. 해야 할까?

  // preview update 해야 함
  let prevText = "";

  for (const block of body.content.blocks) {
    if (block.type === "paragraph") {
      let dom = parser.parse(block.data.text);
      prevText += " " + dom.textContent;
    }

    if (prevText.length >= 100) {
      break;
    }
  }

  const prevImg = body.content.blocks.find((item) => item.type === "image");

  // content, preview update
  let result;
  try {
    result = await Post.updateOne(
      { _id: postId },
      {
        title: body?.title,
        content: body.content,
        preview: {
          text: prevText,
          img: prevImg?.data.url,
        },
      }
    );
  } catch (error) {
    return res.status(500).json({
      msg: "post update error",
      reason: error,
    });
  }

  return res.status(200).json({
    //수정 완료 시
    result,
  });
});

module.exports = router;
