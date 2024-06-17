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
      "https://i.guim.co.uk/img/media/8c7f4fe66d305fb86fc3246dd47a9c06d216f7ec/0_139_1268_761/master/1268.jpg?width=1200&height=1200&quality=85&auto=format&fit=crop&s=f27fa05d2f7629655beafeb9248c7647",
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
  }
);

module.exports = mongoose.model("post", postSchema);
