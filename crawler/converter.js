const fs = require('fs');
const xml2js = require('xml2js');

const xmlFilePath = './CORPCODE.xml';  // XML 파일 경로
const jsonFilePath = './corpcode.json';  // 변환된 JSON 파일 경로

// XML 파일을 읽어와서 JSON으로 변환
fs.readFile(xmlFilePath, (err, data) => {
  if (err) {
    console.error('Error reading XML file:', err);
    return;
  }

  xml2js.parseString(data, (err, result) => {
    if (err) {
      console.error('Error converting XML to JSON:', err);
      return;
    }

    // JSON 데이터를 파일로 저장
    fs.writeFile(jsonFilePath, JSON.stringify(result, null, 2), (err) => {
      if (err) {
        console.error('Error writing JSON file:', err);
        return;
      }

      console.log('XML successfully converted to JSON and saved to', jsonFilePath);
    });
  });
});