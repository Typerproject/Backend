const mongoose = require("mongoose");

const kakaoTokenSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
});

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    nickname: { type: String, required: true, unique: true },
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
      userId: user.userId,
      nickname: user.nickname,
    };
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;
