const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
  time: { type: Number, required: true },
  version: { type: String, required: true },
  blocks: { type: [Object] },
});

const previewSchema = new mongoose.Schema({
  text: { type: String, default: "Typer" },
  img: {
    type: String,
    default:
      "https://cdn.pixabay.com/photo/2014/10/04/11/49/typewriter-472850_640.jpg",
  },
});

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    title: { type: Object, required: true },
    content: { type: blockSchema, required: true },
    public: { type: Boolean, required: true },
    commentCount: { type: Number, default: 0 },
    scrapingUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "user",
      default: [],
    },
    preview: { type: previewSchema, require: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);
module.exports = mongoose.model("post", postSchema);
