var express = require("express");
var router = express.Router();

const dotenv = require("dotenv");
const axios = require("axios");
const https = require('https');

dotenv.config();

// 테스트용 코드
router.get("/", async (req, res) => {
    try {
        const url = 'https://gapi.shinhansec.com:8443/openapi/v1.0/strategy/market-issue';
        const apiKey = process.env.SHIN_HAN_APIKEY  ;
        const agent = new https.Agent({  
            rejectUnauthorized: false
        });
        
            const hello = await axios.get(url, {
                headers: {
                    'apiKey': apiKey
                },
                httpsAgent: agent
            });
    
            const result=hello.data.dataBody.list;
    
            const hi=[]
            result.map((elem)=>{
                hi.push(elem.content.split('\n'))
                
                
            })
            final=[]
            
            hi.map((elem)=>{
                news=[]
                
                news.push(elem[0])
                news.push(elem[1])
                news.push(elem[2])
                final.push(news)
            })
            

    
            
      res.status(200).json(final);
    } catch (error) {
      console.error("유저 정보 조회 에러", error);
    }
  });










module.exports = router;