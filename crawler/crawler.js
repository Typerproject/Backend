const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

(async function example() {
  let options = new chrome.Options();
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  
  let allData = {};

  try {
    for (let i = 1; i <= 423; i++) {
      await driver.get(`https://consensus.hankyung.com/analysis/list?&sdate=2020-01-01&edate=2024-06-08&report_type=CO&pagenum=80&order_type=&now_page=${i}`);
      console.log(i)
      let elements = await driver.findElements(By.css('.table_style01 tbody tr'));
      for (let element of elements) {
        let bonmuns = await element.findElements(By.css('.text_l'));
        let dateElement = await element.findElement(By.css('td:nth-child(1)'));
        let analysisElement = await element.findElement(By.css('td:nth-child(5)'));
        let companyElement = await element.findElement(By.css('td:nth-child(6)'));

        let date = await dateElement.getText();
        let analysts = await analysisElement.getText();
        let company = await companyElement.getText();

        for (let bonmun of bonmuns) {
          let urlelement = await bonmun.findElement(By.css('a'));
          let url = await urlelement.getAttribute('href');
          let text = await bonmun.getText();
          let parts = text.split(')');
          let companyKey = parts[0] + ')';
          let title = parts.slice(1).join(')').trim();

          if (!allData[companyKey]) {
            allData[companyKey] = [];
          }

          allData[companyKey].push({
            date: date,
            analyst: analysts,
            title: title,
            url: url,
            securities:company
          });
        }
      }
    }

    fs.writeFileSync('output.json', JSON.stringify(allData, null, 2));
  } finally {
    await driver.quit();
  }
})();