const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
  time: { type: Number, required: true },
  version: { type: String, required: true },
  blocks: { type: [Object] },
});

const postSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    title: { type: Object, required: true },
    content: { type: blockSchema, required: true },
    public: { type: Boolean, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("post", postSchema);
