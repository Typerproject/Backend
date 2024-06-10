
const axios=require('axios');


const hi=async () =>{
    const response=await axios.get("https://opendart.fss.or.kr/api/fnlttMultiAcnt.json?crtfc_key=07d1a9090fa1e327b7e01c3f46ba8ac72d3125f6&corp_code=00126380&bsns_year=2018&reprt_code=11011")
    console.log(response.data)
}
hi()