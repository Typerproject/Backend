const mongoose = require("mongoose");

const kakaoTokenSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
});

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    nickname: { type: String, required: true },
    email: { type: String, required: true },
    comment: { type: String, default: null },
    profile: { type: String, required: true },
    token: kakaoTokenSchema,
    scrappedPosts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "post",
      default: [],
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
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

userSchema.virtual("posts", {
  ref: "post",
  localField: "_id",
  foreignField: "userId",
});

userSchema.statics.enroll = async function (
  userId,
  nickname,
  email,
  profile,
  accessToken,
  refreshToken
) {
  try {
    const user = await this.create({
      userId,
      nickname,
      email,
      profile,
      token: {
        accessToken,
        refreshToken,
      },
    });

    return {
      _id: user._id,
      userId: user.userId,
      nickname: user.nickname,
    };
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model("user", userSchema);

module.exports = User;
