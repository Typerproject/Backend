const mongoose =require("mongoose")

const reviewSchema=new mongoose.Schema(
    {
        postId:{type:Number,required:true},
        reviewId:{type:Number,required:true},
        content:{type:String,required:true},
    },{
        timestamps:true,
    }



);

module.exports=mongoose.model("review",reviewSchema);