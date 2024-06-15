var express = require("express");
var router = express.Router();
const CorpCode = require("../../model/corpCode");
const { ObjectId } = require("mongodb");

router.get("/corpCode", async (req, res) => {
  const queryName = req.query.name;
  console.log(queryName);

  const corpCode = await CorpCode.find({
    corpName: { $regex: queryName },
  }).limit(10);

  res.status(200).json(corpCode);
});

module.exports = router;
