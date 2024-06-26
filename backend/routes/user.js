var express = require("express");
var router = express.Router();
const ObjectId = require("mongoose").Types.ObjectId;

const User = require("../model/user");
const Follower = require("../model/follower");

const { authenticateJWT, kakaoLogout } = require("../utils/authenticateJWT");
const Post = require("../model/post");
const comment = require("../model/comment");
const { makeUserInfo } = require("../utils/makeUserInfo");

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
router.get("/info/:_id", makeUserInfo, async (req, res, next) => {
  try {
    const userId = req.params._id;
    const cookieId = req.userId ? req.userId : "";

    const options = { sort: { createdAt: -1 } };

    const userData = await User.findById(userId).populate({
      path: "posts",
      options: options,
    });

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
          isScrapped: ele.scrapingUsers.some((id) => {
            return id.equals(cookieId);
          }),
          commentCount: ele.commentCount,
        };
      }),
    });
  } catch (error) {
    console.error("마이페이지에 유저 정보를 띄우기 위한 api 에러: ", error);
    next(error);
  }
});

router.get("/info/post/:userId", makeUserInfo, async (req, res) => {
  const userId = req.params.userId;
  const cookieId = req.userId ? req.userId : "";

  const perPage = 10;
  const currentPage = req.query.page || 1;

  const postList = await Post.find({ userId: new ObjectId(userId) })
    .skip((currentPage - 1) * perPage)
    .limit(perPage)
    .sort({ createdAt: -1 });

  res.json(
    postList.map((ele) => {
      return {
        title: ele.title,
        _id: ele._id,
        preview: ele.preview,
        createdAt: ele.createdAt,
        public: ele.public,
        scrapingCount: ele.scrapingUsers.length,
        isScrapped: ele.scrapingUsers.some((id) => {
          return id.equals(cookieId);
        }),
        commentCount: ele.commentCount,
      };
    })
  );
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

// 팔로워를 제거 api ()
router.delete("/follower/:_id", authenticateJWT, async (req, res, next) => {
  try {
    // 제거하려는 유저의 아이디
    let targetUserId = req.params._id;

    // 현재 내 아이디
    let currentUserId = req.user._id;

    console.log("targetUserId", targetUserId);
    console.log("currentUserId", currentUserId);

    // 내가 팔로잉 했던 사람을 제거
    const result = await Follower.updateOne(
      { userId: currentUserId },
      { $pull: { follower_userId: targetUserId } }
    );

    const what = await Follower.findOne({ userId: currentUserId });

    console.log("What", what);

    console.log("업데이트 체크: ", result);

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
  try {
    const userId = req.user._id;

    const newNickname = req.body.nickname;

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

router.get("/logout", authenticateJWT, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(200).json({ message: "유저 조회가 안 됩니다." });
      return;
    }

    console.log("user.js - user : ", user);

    const userId = await kakaoLogout(user.token.accessToken);

    console.log("user.js - userId : ", userId);

    if (!userId) {
      res.status(200).json({ message: "카카오 로그아웃이 안 됩니다." });
      return;
    }

    res.cookie("authToken", "", {
      httpOnly: true,
      maxAge: 10000,
    });

    res.status(200).json({ message: "로그아웃 성공띠" });

    user.token.accessToken = "";
    user.token.refreshToken = "";

    await user.save();
  } catch (error) {
    console.error("로그아웃 에러 발생: ", error);
    next(error);
  }
});

// router.post("/refresh", async (req, res, next) => {
//   try {
//     const userId = req.body._id;

//     console.log("refreshing", userId);

//     if (!userId) {
//       res.status(401).json({ message: "인증 에러 (유저 아이디 식별 불가)" });
//       return;
//     }

//     const user = await User.findById(userId);

//     if (!user) {
//       res.status(401).json({ message: "인증 에러 (유저 정보 조회 불가)" });
//       return;
//     }

//     const newTokens = await refreshKakaoToken(user.token.refreshToken);

//     if (!newTokens) {
//       res.status(401).json({ message: "인증 에러 (리프레시 토큰 유효 X)" });
//       return;
//     }

//     console.log("뉴토큰!", newTokens);

//     user.token.accessToken = newTokens.access_token;
//     if (newTokens.refresh_token) {
//       user.token.refreshToken = newTokens.refresh_token;
//     }

//     await user.save();

//     // 새로운 JWT 발급
//     const userData = {
//       _id: user._id,
//       nickname: user.nickname,
//       email: user.email,
//       comment: user.comment,
//       profile: user.profile,
//     };
//     const newToken = jwt.sign(userData, jwtSecret, {
//       expiresIn: newTokens.expires_in,
//     });

//     // 쿠키 설정
//     res.cookie("authToken", newToken, {
//       httpOnly: true,
//       maxAge: 3600000 * 2,
//       // sameSite: "None",
//     });

//     req.user = userData; // 유저 정보를 req 객체에 저장
//     next();
//   } catch (error) {
//     console.error("쿠키 재발급 에러 (리프레시 토큰): ", error);
//     next(error);
//   }
// });

module.exports = router;
