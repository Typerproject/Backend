var express = require('express');
var router = express.Router();
const report=require('../model/analyst')

router.get('/',async function(req, res) {
  const name = req.query.company

  const finalreport=await report.find()
  const new_report=finalreport.filter((elem)=>elem.company.split("(")[0].includes(name))
  
  
  res.json(new_report);

  });

router.get("/all",async function(req,res){
  
  const allreport=await report.find()
  res.json(allreport)
});



module.exports = router;