var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const User = require("../model/user");



router.get("/",async (req,res)=>{

    const search=req.query.value;
    
    const result = await Post.find({ title: { $regex: search, $options: 'i' } }); 

    
                    
    const new_array = await Promise.all(result.map(async (elem, idx) => {
        const response = await User.findOne({ _id: elem.userId }); 

        const nick = response ? response.nickname : 'Unknown';
        const profile = response.profile;
        
   
        return {
            profile:profile,
            nickname:nick,
            _id: elem._id,
            title:elem.title,
            preview: elem.preview
        };
    }));

    res.json(new_array)

})



module.exports = router;