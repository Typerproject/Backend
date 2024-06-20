const mongoose = require("mongoose");

const followerSchema = new mongoose.Schema(
  {
    // _id를 의미함
    following_userId: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "user",
      default: [],
    },
    follower_userId: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "user",
      default: [],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  {
    timestamps: {
      currentTime: () => {
        let date = new Date();
        let newDate = new Date(
          date.getTime() + date.getTimezoneOffset() * 60 * 1000 * -1
        );
        console.log(newDate);
        return newDate;
      },
    },
  }
);

followerSchema.statics.enroll = async function (userId) {
  try {
    const follower = await this.create({
      userId,
    });

    return follower;
  } catch (error) {
    throw error;
  }
};

// following_userId와 follower_userId 배열에 있는 유저들의 닉네임과 프로필을 가져오고, 팔로잉/팔로워 카운트 반환
followerSchema.statics.getFollowerCountsAndFollowerUser = async function (
  userId
) {
  try {
    const follower = await this.findOne({ userId })
      .populate("following_userId", "_id nickname profile")
      .populate("follower_userId", "_id nickname profile");

    if (!follower) {
      throw new Error("유저 아이디에 따른 follower 정보가 조회되지 않습니다.");
    }

    const followingUsers = follower.following_userId.map((user) => ({
      _id: user._id,
      nickname: user.nickname,
      profile: user.profile,
    }));

    const followerUsers = follower.follower_userId.map((user) => ({
      _id: user._id,
      nickname: user.nickname,
      profile: user.profile,
    }));

    return {
      followingCount: follower.following_userId.length,
      followerCount: follower.follower_userId.length,
      followingUsers: followingUsers,
      followerUsers: followerUsers,
    };
  } catch (error) {
    throw error;
  }
};

const Follower = mongoose.model("follower", followerSchema);

module.exports = Follower;
