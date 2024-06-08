const mongoose =require("mongoose")

const postSchema=new mongoose.Schema(
    {
        postId:{type:Number,required:true},
        userId:{type:String,required:true,unique:true},
        ratelist:{type:[String],required:true},
        title:{type:String,required:true},
        content:{type:String,required:true},
        secret:{type:Boolean,required:true,default:false}
    },{
        timestamps:true,
    }



);

module.exports=mongoose.model("post",postSchema);