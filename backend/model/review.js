const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    postId: { type: Number, required: true },
    reviewId: { type: Number, required: true },
    content: { type: String, required: true },
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

module.exports = mongoose.model("review", reviewSchema);
