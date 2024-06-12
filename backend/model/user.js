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
  },
  {
    timestamps: true,
  }
);

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
