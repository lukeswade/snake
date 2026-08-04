const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080'); // Assuming we start a server
  await page.waitForSelector('#btn-theme');
  
  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Initial theme:', initialTheme);
  
  await page.click('#btn-theme');
  
  const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('New theme:', newTheme);
  
  await browser.close();
})();
