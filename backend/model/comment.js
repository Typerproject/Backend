const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: {
      //댓글이 달리는 포스트
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "post",
    },
    writerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    text: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    replies: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "reply",
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
    versionKey: false,
  }
);

const replySchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "post",
    },
    writerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "comment",
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Comment = mongoose.model("comment", commentSchema);
const Reply = mongoose.model("reply", replySchema);

module.exports = { Comment, Reply };
