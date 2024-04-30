import { connect } from "./index.js";
import logger from "./module/logger.js";
import { links } from "./module/links.js";
import { RedisManager } from "./module/redis.js";
import settings from "./module/cfg.cjs";

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
  /**
   * Initialize redis & connect
   */
  await RedisManager.connect(settings.redis);

  const task = [];
  let result;

  const values = Object.values(links);
  for (const link of values) {
    await main(link); // ~ 1.5 seconds

    await new Promise((resolve) => setTimeout(resolve, 10000));

    logger.info("Connection done");

    result = await page.evaluate(() => {
      const resultArr = [];
      const table = document.querySelectorAll(
        'div[class="ds-dex-table ds-dex-table-top"] > a'
      );

      for (const item of table) {
        resultArr.push({
          address:
            item
              .querySelector("div:nth-child(1) > img:nth-of-type(2)")
              ?.getAttribute("src")
              .split(".png")[0]
              .split("tokens")[1] || null,
          link: item.getAttribute("href"),
        });
      }
      return resultArr;
    });

    logger.info(
      "Parsing addresses that couldn't be collected from the main page"
    );
    for (const el of result) {
      if (el.address === null) {
        await page.goto(`https://dexscreener.com${el.link}`, {
          waitUntil: "domcontentloaded",
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const resultAddresses = await page.evaluate(() => {
          const element = document.querySelectorAll(
            'a[title="Open in block explorer"]'
          )[1];
          return element.getAttribute("href").split("token/")[1] || null;
        });
        task.push(resultAddresses);
      } else task.push(el.address.split("/")[2]);
    }
    await RedisManager.set(
      Object.entries(links).find(([key, value]) => value === link)?.[0],
      task,
      "10m"
    );

    logger.info(`End of parse link: ${link}`);
    // const response = await RedisManager.select("solanaTrending");
    // console.log(response);
    await browser.close();
  }
  return task;
}

async function startParsingAndScheduleNext() {
  await startParsing();
  setTimeout(startParsingAndScheduleNext, 1 * 60 * 1000); // Вызываем снова через 1 минут после завершения startParsing
}

// Запускаем процесс в первый раз
startParsingAndScheduleNext();
