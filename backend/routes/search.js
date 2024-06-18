var express = require("express");
var router = express.Router();
const Post = require("../model/post");



router.get("/",async (req,res)=>{

    const search=req.query.value;
    const result = await Post.find({ title: { $regex: search, $options: 'i' } }); 
    const new_array = result.map((elem, idx) => {
        return {
            _id: elem._id,
            title:elem.title,
            preview: elem.preview
        };
    });

    res.json(new_array)

})



module.exports = router;