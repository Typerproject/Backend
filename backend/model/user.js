const mongoose =require("mongoose")

const userSchema=new mongoose.Schema(
    {
        userId:{type:String,required:true},
        nickname:{type:String,required:true,unique:true},
        email:{type:String,required:true},
        comment:{type:String,required:true},
        profile:{type:String,required:true}
    },{
        timestamps:true,
    }


);

module.exports=mongoose.model("user",userSchema);