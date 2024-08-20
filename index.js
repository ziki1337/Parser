const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node index.js <url> <region>');
    process.exit(1);
  }

  const [url, region] = args;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,  
    height: 1080,  
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // обходим защиту
    await new Promise(resolve => setTimeout(resolve, 5000));

    // инфа про отладку
    const html = await page.content();
    fs.writeFileSync('page-debug.html', html);
    console.log('HTML content saved to page-debug.html');

    //закрытие всплывающего окна
    const modalExists = await page.$('div[class^="Modal_modal__"]') !== null;

  if (modalExists) {
    await page.click('button[class^="Content_remove__"]');
    await page.waitForSelector('div[class^="Modal_modal__"]', { hidden: true });
    console.log('Modal пропал, продолжаем работу.');
  } else {
    console.log('Modal не найден, действие не требуется.');
  }

    // выбор региона 
  
    const region2 = await page.evaluateHandle((region) => {
      const xpath = `//span[contains(text(), "${region}")]`;
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    }, region);
    console.log(region2);
    if (region2 == region){
    }
    else {
      await page.screenshot({ path: 'screenshotDO.jpg', fullPage: true });
      await page.waitForSelector('div[class^="Region_region__"]', { visible: true });
      await page.click('div[class^="Region_region__"]');
      await page.waitForSelector('div[class^="UiRegionListBase_listWrapper__"]', { timeout: 30000 }); 
      await page.evaluate((region) => {
        // находим все элементы li с нужным классом
        const items = document.querySelectorAll('li[class^="UiRegionListBase_item___"]');
        
        // 
        for (let item of items) {
          if (item.textContent.trim() === region) {
            item.click();  
            break;
          }
        }
      }, region);
      await page.waitForNavigation({ waitUntil: 'networkidle2' }); 
    }

    // await page.click('li[class="UiRegionListBase_item___"]', region);

    // await page.waitForSelector('.ui-suggest-item__link');
    // await page.click('.ui-suggest-item__link');

    //ждем загрузку страницы с регионом

    // скрин
    await page.screenshot({ path: 'screenshot.jpg', fullPage: true });

    // получаем инфу о товаре
    const productData = await page.evaluate(() => {
      // функция для извлечения и обработки цен с уточнением получения текста из текстового узла
      const extractPrice = (selector) => {
        const element = document.querySelector(selector);
        if (!element || !element.firstChild || element.firstChild.nodeType !== Node.TEXT_NODE) return null;
        const priceText = element.firstChild.nodeValue.trim().replace(/\s/g, '').replace('₽', '');
        return parseFloat(priceText.replace(',', '.'));
      };

      const priceSelector = 'div[class^="PriceInfo_root__"] > span[class^="Price_price__"]';
      const priceOldSelector = 'div[class^="PriceInfo_oldPrice__"] > span[class^="Price_price__"]';
      const ratingSelector = 'div[class^="ActionsRow_reviewsWrapper__"] > a[class^="ActionsRow_stars__"]';
      const reviewCountSelector = 'div[class^="ActionsRow_reviewsWrapper__"] > a[class^="ActionsRow_reviews__"]';

      const price = extractPrice(priceSelector);
      const priceOld = extractPrice(priceOldSelector); 
      const rating = document.querySelector(ratingSelector)?.innerText.trim() || null;
      const reviewCount = document.querySelector(reviewCountSelector)?.innerText.trim().replace(/\D/g, '') || null;

      return { price, priceOld, rating, reviewCount };
    });

    // записываем информацию в файл
    const productInfo = [
      `price=${productData.price}`,
      `priceOld=${productData.priceOld || "N/A"}`,
      `rating=${productData.rating}`,
      `reviewCount=${productData.reviewCount}`
    ].join('\n');

    fs.writeFileSync('product.txt', productInfo);

    console.log('Data saved successfully!');
  } catch (error) {
    console.error('Error:', error);

    const errorHtml = await page.content();
    fs.writeFileSync('error-page.html', errorHtml);
    console.log('Error HTML content saved to error-page.html');
  } finally {
    await browser.close();
  }
})();