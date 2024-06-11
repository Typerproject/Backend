const mongoose =require("mongoose")



const jaemus=new mongoose.Schema(
    {
        기업:{type:String,required:true},
        매출액: { type: [String], required: true }, 
        영업이익: { type: [String], required: true }, 
        당기순이익:{type:[String],required:true},
        지배주주순이익:{type:[String],required:true},
        비지배주주순이익:{type:[String],required:true},
        영업이익률:{type:[String],required:true},
        순이익률:{type:[String],required:true},
        ROE :{type:[String],required:true},
        부채비율:{type:[String],required:true},
        당좌비율:{type:[String],required:true},
        유보율:{type:[String],required:true},
        EPS:{type:[String],required:true},
        PER:{type:[String],required:true},
        BPS:{type:[String],required:true},
        PBR :{type:[String],required:true},
        주당배당금:{type:[String],required:true}
    }


);

module.exports=mongoose.model("jaemus",jaemus);