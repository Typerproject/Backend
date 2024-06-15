const mongoose = require("mongoose");

const corpCode = new mongoose.Schema({
  corpName: { type: String, required: true },
  cropCode: { type: Number, required: true },
});

module.exports = mongoose.model("corpCode", corpCode);
