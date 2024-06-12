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
    timestamps: true,
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

const Follower = mongoose.model("follower", followerSchema);

module.exports = Follower;
