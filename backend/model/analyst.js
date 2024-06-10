const mongoose =require("mongoose")



const company=new mongoose.Schema(
    {
        company:{type:String,required:true},
        date: { type: Date, required: true }, 
        analyst: { type: String, required: true }, 
        title:{type:String},
        url:{type:String,required:true}
    }


);

module.exports=mongoose.model("companyreport",company);