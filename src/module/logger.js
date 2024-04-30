import clc from "cli-color";

const getTimeStamp = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace("T", " ").substring(0, 23);
  return `[${timestamp}]`;
};

/**
 * Logger
 * @example
 * logger.success('Success msg'); //green
 * logger.error('Error msg'); //red
 * logger.warning('Warning msg'); //yellow
 * logger.log('Just logger'); //blue
 */

const logger = {
  success: (message) => console.log(clc.green(getTimeStamp(), "[SUCCESS] [PUPPETEER-REAL-BROWSER] |", message)),
  error: (message) => console.log(clc.red(getTimeStamp(), "[ERROR] [PUPPETEER-REAL-BROWSER] |", message)),
  warning: (message) =>
    console.log(clc.yellow(getTimeStamp(), "[WARNING] [PUPPETEER-REAL-BROWSER] |", message)),
  info: (message) => console.log(clc.blue(getTimeStamp(), "[INFO] [PUPPETEER-REAL-BROWSER] |", message)),
};

export default logger;
