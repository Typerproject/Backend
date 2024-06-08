const mongoose =require("mongoose")

const followerSchema=new mongoose.Schema(
    {
        following_userId: { type: [String], required: true }, 
        following_userId: { type: [String], required: true }, 
        userId:{type:String,required:true}
    },{
        timestamps:true,
    }



);

module.exports=mongoose.model("follow",followerSchema);