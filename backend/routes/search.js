var express = require("express");
var router = express.Router();
const Post = require("../model/post");
const User = require("../model/user");



router.get("/",async (req,res)=>{

    const page=Number(req.query.page);

    const search = req.query.value || '';

    if (search.lenghth<2 || /^[.,!?]*$/.test(search)){
      return res.status(400).json({error:'허용되지않는 문자입니다.'})
    }
    

    const limit=5

    const start=(page-1)*limit


    const result = await Post.find({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { 'preview.text': { $regex: search, $options: 'i' } }
        ]
      }).sort({createdAt:1}).skip(start).limit(5)

      const total=await Post.countDocuments({$or: [
        { title: { $regex: search, $options: 'i' } },
        { 'preview.text': { $regex: search, $options: 'i' } }
      ]})

    

    
                    
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

    res.json({new_array,total})

})


router.get("/writer",async (req,res)=>{

    const nick=req.query.value;
    const page=Number(req.query.page);

    const limit=5

    const start=(page-1)*limit

    const findnickname= await User.find({nickname:{ $regex: nick, $options: 'i' } }).skip(start).limit(5)

    const total=await User.find({nickname:{ $regex: nick, $options: 'i' } })
    
    


    const new_array = await Promise.all(findnickname.map(async (elem, idx) => {
    
        return {
            userId:elem._id,
            profile:elem.profile,
            nickname:elem.nickname,
            comment:elem.comment
           
        };
    }));
    
    res.json({new_array,total})
})



module.exports = router;