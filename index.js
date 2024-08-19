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

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // обходим защиту
    await new Promise(resolve => setTimeout(resolve, 5000));

    // инфа про отладку
    const html = await page.content();
    fs.writeFileSync('page-debug.html', html);
    console.log('HTML content saved to page-debug.html');

    // выбор региона (ПОКА ЧТО НЕ РАБОТАЕТ, ПОКА ЧТО ХЗ)
    // await page.click('button[data-role="city-selector"]');
    // await page.waitForSelector('input[name="select-city"]', { timeout: 30000 });
    // await page.type('input[name="select-city"]', region);
    // await page.waitForSelector('.ui-suggest-item__link');
    // await page.click('.ui-suggest-item__link');

    // ждем загрузку страницы с регионом
    // await page.waitForNavigation({ waitUntil: 'networkidle2' });

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
      const priceOldSelector = 'span.Price_old__someSelector';
      const ratingSelector = '.product-rating__value';
      const reviewCountSelector = '.product-rating__count';

      const price = extractPrice(priceSelector);
      const priceOld = extractPrice(priceOldSelector); 
      const rating = document.querySelector(ratingSelector)?.innerText.trim() || null;
      const reviewCount = document.querySelector(reviewCountSelector)?.innerText.trim().replace(/\D/g, '') || null;

      return { price, priceOld, rating, reviewCount };
    });

    // записываем информацию в файл
    const productInfo = [
      `price=${productData.price}`,
      `priceOld=${productData.priceOld}`,
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