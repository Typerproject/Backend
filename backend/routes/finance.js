var express = require('express');
var router = express.Router();
const finacnce=require('../model/finance');

router.get('/', async function(req, res,) {
    const name = req.query.company

    const jaemu=await finacnce.find()
    const new_report=jaemu.filter((elem)=>elem.기업.includes(name))
    
    
    res.json(new_report);
});

module.exports = router;
