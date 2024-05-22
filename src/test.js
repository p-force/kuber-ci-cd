// import { connect } from "./index.js";
// import logger from "./module/logger.js";
// import { links } from "./module/links.js";
// import { RedisManager } from "./module/redis.js";

// let page;
// let browser;

// async function main(link) {
//   logger.info("The beginning of the parser's operation.");

//   const data = await connect({
//     headless: "auto",
//     args: [],
//     customConfig: {},
//     skipTarget: [],
//     fingerprint: false,
//     turnstile: true,
//     connectOption: {},
//   });

//   page = data.page;
//   browser = data.browser;

//   logger.info("Connected to browser");

//   await page.goto(link, {
//     waitUntil: "domcontentloaded",
//   });
// }

// async function startParsing() {
//   /**
//    * Initialize redis & connect
//    */
//   await RedisManager.connect();

//   let task = [];
//   let result;
//   let key;

//   const values = Object.values(links);
//   for (const link of values) {
//     task = [];
//     await main(link); // ~ 1.5 seconds
//     key = link; //ссылка

//     await new Promise((resolve) => setTimeout(resolve, 10000));

//     logger.info("Connection done");

//     result = await page.evaluate(() => {
//       const resultArr = [];
//       const table = document.querySelectorAll(
//         'div[class="ds-dex-table ds-dex-table-top"] > a'
//       );

//       for (const item of table) {
//         resultArr.push({
//           address:
//             item
//               .querySelector("div:nth-child(1) > img:nth-of-type(2)")
//               ?.getAttribute("src")
//               .split(".png")[0]
//               .split("tokens")[1] || null,
//           link: item.getAttribute("href"),
//         });
//       }
//       return resultArr;
//     });

//     logger.info(
//       "Parsing addresses that couldn't be collected from the main page"
//     );
//     for (const el of result) {
//       if (el.address === null) {
//         await page.goto(`https://dexscreener.com${el.link}`, {
//           waitUntil: "domcontentloaded",
//         });
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//         const resultAddresses = await page.evaluate(() => {
//           const element = document.querySelectorAll(
//             'a[title="Open in block explorer"]'
//           )[1];
//           return element.getAttribute("href").split("token/")[1] || null;
//         });
//         task.push(
//           typeof resultAddresses === "string"
//             ? resultAddresses
//             : JSON.stringify(resultAddresses)
//         );
//       } else
//         task.push(
//           typeof el.address.split("/")[2] === "string"
//             ? el.address.split("/")[2]
//             : JSON.stringify(el.address.split("/")[2])
//         );
//     }
//     await RedisManager.setList(
//       Object.entries(links).find(([_, value]) => value === key)?.[0],
//       [...new Set(task)],
//       "1d"
//     );

//     logger.info(`End of parse link: ${link}`);
//     const response = await RedisManager.select(
//       Object.entries(links).find(([_, value]) => value === key)?.[0]
//     );
//     logger.info(response);
//     await browser.close();
//   }
//   return task;
// }

// async function startParsingAndScheduleNext() {
//   await startParsing();
//   setTimeout(startParsingAndScheduleNext, 1 * 60 * 1000); // Вызываем снова через 1 минут после завершения startParsing
// }

// // Запускаем процесс в первый раз
// startParsingAndScheduleNext();

import { connect } from "./index.js";
import logger from "./module/logger.js";
import { links } from "./module/links.js";
import { RedisManager } from "./module/redis.js";

let page;
let browser;

async function main(link) {
  logger.info("The beginning of the parser's operation.");

  const data = await connect({
    headless: "auto",
    args: [],
    customConfig: {},
    skipTarget: [],
    fingerprint: false,
    turnstile: true,
    connectOption: {},
  });

  page = data.page;
  browser = data.browser;

  logger.info("Connected to browser");

  await page.goto(link, {
    waitUntil: "domcontentloaded",
  });
}

async function startParsing() {
  while (true) { // Используем бесконечный цикл
    /**
     * Initialize redis & connect
     */
    await RedisManager.connect();

    let task = [];
    let result;
    let key;

    const values = Object.values(links);
    for (const link of values) {
      task = [];
      await main(link); // ~ 1.5 seconds
      key = link; // ссылка

      await new Promise((resolve) => setTimeout(resolve, 10000));

      logger.info("Connection done");

      result = await page.evaluate(() => {
        const resultArr = [];
        const table = document.querySelectorAll('div[class="ds-dex-table ds-dex-table-top"] > a');

        for (const item of table) {
          resultArr.push({
            address: item.querySelector("div:nth-child(1) > img:nth-of-type(2)")?.getAttribute("src").split(".png")[0].split("tokens")[1] || null,
            link: item.getAttribute("href"),
          });
        }
        return resultArr;
      });

      logger.info("Parsing addresses that couldn't be collected from the main page");
      for (const el of result) {
        if (el.address === null) {
          await page.goto(`https://dexscreener.com${el.link}`, {
            waitUntil: "domcontentloaded",
          });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const resultAddresses = await page.evaluate(() => {
            const element = document.querySelectorAll('a[title="Open in block explorer"]')[1];
            return element.getAttribute("href").split("token/")[1] || null;
          });
          task.push(typeof resultAddresses === "string" ? resultAddresses : JSON.stringify(resultAddresses));
        } else {
          task.push(typeof el.address.split("/")[2] === "string" ? el.address.split("/")[2] : JSON.stringify(el.address.split("/")[2]));
        }
      }

      await RedisManager.setList(
        Object.entries(links).find(([_, value]) => value === key)?.[0],
        [...new Set(task)],
        "1d"
      );

      logger.info(`End of parse link: ${link}`);
      const response = await RedisManager.select(
        Object.entries(links).find(([_, value]) => value === key)?.[0]
      );
      logger.info(response);
      await browser.close();
    }

    // Пауза перед следующей итерацией
    await new Promise(resolve => setTimeout(resolve, 1 * 60 * 1000));
  }
}

// Запускаем процесс
startParsing();
