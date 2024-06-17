var express = require("express");
var router = express.Router();

const User = require("../model/user");
const Follower = require("../model/follower");

const { authenticateJWT } = require("../utils/authenticateJWT");

// 인증 테스트 api
router.get("/", authenticateJWT, async (req, res, next) => {
  try {
    const user = req.user;

    console.log(user);

    res.status(200).json(user);
  } catch (error) {
    console.error("유저 정보 조회 에러", error);
    next(error);
  }
});

// 마이페이지에 유저 정보를 띄우기 위한 api
router.get("/info/:_id", async (req, res, next) => {
  try {
    const userId = req.params._id;
    const userData = await User.findById(userId).populate("posts");

    if (!userData) {
      res.status(404).json({ errorMessage: "유저 조회 ㄴㄴ" });
      return;
    }

    return res.status(200).json({
      _id: userData._id,
      nickname: userData.nickname,
      comment: userData.comment,
      profile: userData.profile,
      writerdPost: userData.posts.map((ele, idx) => {
        return {
          title: ele.title,
          _id: ele._id,
          preview: ele.preview,
          createdAt: ele.createdAt,
          public: ele.public,
          scrapingCount: ele.scrapingUsers.length,
        };
      }),
    });
  } catch (error) {
    console.error("마이페이지에 유저 정보를 띄우기 위한 api 에러: ", error);
    next(error);
  }
});

// 유저의 팔로워 수와 팔로우 한 사람의 수 + 유저 리스트까지
router.get("/follower/:_id", async (req, res, next) => {
  try {
    const followerData = await Follower.getFollowerCountsAndFollowerUser(
      req.params._id
    );

    res.status(200).json(followerData);
  } catch (error) {
    console.error("팔로우 수 정보 api 에러: ", error);
    next(error);
  }
});

// 유저 한 줄 소개 수정 api
// 이거 실행되면 프론트 전역변수 수정해줘야 할듯
// 인증 必
router.put("/comment", authenticateJWT, async (req, res, next) => {
  try {
    // 바디에서 comment 값 받아서 처리
    const newComment = { comment: req.body.comment };

    const updatedUser = await User.findByIdAndUpdate(req.user._id, newComment, {
      new: true,
    });

    if (!updatedUser) {
      res.status(404).json({ errorMessage: "유저 조회 ㄴㄴ" });
      return;
    }

    res
      .status(200)
      .json({ message: "업데이트 성공", comment: updatedUser.comment });
  } catch (error) {
    console.error("유저 한 줄 소개 수정 api 에러: ", error);
    next(error);
  }
});

// 내가 누군가를 팔로우 하는 api
// 인증 必
router.post("/following", authenticateJWT, async (req, res, next) => {
  try {
    // 팔로잉 하려는 유저의 id
    // 바디로 받아서 처리
    const targetUserId = req.body._id;

    // 내 아이디
    const currentUserId = req.user._id;

    // 팔로잉 배열의 길이 확인 (추가 전)
    const currentUser = await Follower.findOne({ userId: currentUserId });
    const initialFollowingCount = currentUser.following_userId.length;

    console.log("initialFollowingCount", initialFollowingCount);

    // 팔로잉 함
    const result = await Follower.updateOne(
      { userId: currentUserId },
      { $addToSet: { following_userId: targetUserId } } // addToSet을 사용하면 중복 추가를 방지한다고 함
    );

    // 팔로잉 배열의 길이 확인 (추가 후)
    const updatedUser = await Follower.findOne({ userId: currentUserId });
    const updatedFollowingCount = updatedUser.following_userId.length;

    if (initialFollowingCount === updatedFollowingCount) {
      res.status(400).json({
        message: "이미 팔로우하고 있는 유저입니다.",
        response: false,
      });
      return;
    }

    if (result.nModified === 0) {
      res.status(404).json({
        message:
          "result, 유저 정보가 없거나 팔로잉을 취소하려는 유저의 데이터가 없습니다.",
        response: false,
      });
      return;
    }

    console.log("result: ", result);

    // 상대방 팔로워에 내 아이디 추가
    const check = await Follower.updateOne(
      { userId: targetUserId },
      { $addToSet: { follower_userId: currentUserId } }
    );

    if (check.nModified === 0) {
      res.status(404).json({
        message:
          "check, 유저 정보가 없거나 팔로잉을 취소하려는 유저의 데이터가 없습니다.",
        response: false,
      });
      return;
    }

    console.log("check: ", check);

    res.status(200).json({ message: "팔로우 성공!", response: true });
  } catch (error) {
    console.error("내가 누군가를 팔로우 하는 api 에러: ", error);
    next(error);
  }
});

// 팔로잉 취소 api
router.delete("/following/:_id", authenticateJWT, async (req, res, next) => {
  try {
    // 취소하려는 유저의 아이디
    const targetUserId = req.params._id;

    // 현재 내 아이디
    const currentUserId = req.user._id;

    // 내가 팔로잉 했던 사람을 제거
    const result = await Follower.updateOne(
      { userId: currentUserId },
      { $pull: { following_userId: targetUserId } }
    );

    console.log("업데이트 체크: ", result.nModified);

    if (result.nModified === 0) {
      res.status(404).json({
        message:
          "result, 유저 정보가 없거나 팔로잉을 취소하려는 유저의 데이터가 없습니다.",
        response: false,
      });
      return;
    }

    const check = await Follower.updateOne(
      { userId: targetUserId },
      { $pull: { follower_userId: currentUserId } }
    );

    console.log("check: ", check);

    if (check.nModified === 0) {
      res.status(404).json({
        message:
          "유저 정보가 없거나 팔로잉을 취소하려는 유저의 데이터가 없습니다.",
        response: false,
      });
      return;
    }

    res.status(200).json({ message: "언팔 성공!", response: true });
  } catch (error) {
    console.error("팔로잉 취소 api 에러: ", error);
    next(error);
  }
});

// 팔로워를 제거 api
router.delete("/follower/:_id", authenticateJWT, async (req, res, next) => {
  try {
    // 제거하려는 유저의 아이디
    const targetUserId = req.params._id;

    // 현재 내 아이디
    const currentUserId = req.user._id;

    // 내가 팔로잉 했던 사람을 제거
    const result = await Follower.updateOne(
      { userId: currentUserId },
      { $pull: { follower_userId: targetUserId } }
    );

    console.log("업데이트 체크: ", result.nModified);

    if (result.nModified === 0) {
      res.status(404).json({
        message:
          "result, 유저 정보가 없거나 팔로잉을 취소하려는 유저의 데이터가 없습니다.",
        response: false,
      });
      return;
    }

    const check = await Follower.updateOne(
      { userId: targetUserId },
      { $pull: { following_userId: currentUserId } }
    );

    console.log("check: ", check);

    if (check.nModified === 0) {
      res.status(404).json({
        message:
          "유저 정보가 없거나 팔로잉을 취소하려는 유저의 데이터가 없습니다.",
        response: false,
      });
      return;
    }

    res.status(200).json({ message: "언팔 성공!", response: true });
  } catch (error) {
    console.error("팔로워를 제거 api 에러: ", error);
    next(error);
  }
});

// 닉네임 변경 api
router.put("/nickname", authenticateJWT, async (req, res, next) => {
  // const userId = req.user._id;

  // const newNickname = req.body.nickname;

  // await User.findOneAndUpdate(userId, newNickname, {
  //   new: true,
  // })
  //   .then((result) => {
  //     console.log("닉넴 변경 api result", result);
  //     res.status(200).json(newNickname);
  //   })
  //   .catch((err) => {
  //     console.error(err);
  //     res.status(500).json({ message: "닉네임 변경 api 에러", error: err });
  //     return;
  //   });

  try {
    const userId = req.user._id;

    const newNickname = req.body.nickname;

    console.log("ldldldldldlddl", newNickname);

    const updatedUser = await User.findOneAndUpdate(
      userId,
      { nickname: newNickname },
      {
        new: true,
      }
    );

    console.log("닉넴 변경 updated", updatedUser);

    res.status(200).json(newNickname);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "닉네임 변경 api 에러", error: error });
    next(error);
  }
});

module.exports = router;
