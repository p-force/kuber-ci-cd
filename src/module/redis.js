import redis, { createClient } from "redis";
import logger from "./logger.js";

const PRIORITY_TIME_TAGS = {
  s: 1000,
  m: 60000,
  h: 3.6e6,
  d: 8.64e7,
  ms: 1,
};

const TIME_TAGS_HUMAN = {
  s: "Seconds",
  m: "Minutes",
  h: "Hours",
  d: "Days",
  ms: "Milliseconds",
};

export class Redis {
  /**
   * @type {redis.RedisClientType}
   */
  client;
  /**
   *
   * @param configure {host: {String}, port: {Number}}
   * @return {Promise<void>}
   */
  async connect(configure) {
    try {
      this.configure = configure;

      const url = `redis://${configure.host}:${configure.port}`;

      logger.info(`Redis connect to: ${url}`);

      this.client = createClient({
        url,
      });

      await this.client.connect();

      logger.info(`Redis client is connected to ${url}`);
    } catch (cause) {
      logger.error("Redis has not connected");
      logger.error(cause);
    }
  }

  /**
   *
   * @param messageId {Object}
   * @param messageData {Object}
   * @param lifetime {string}
   */
  async set(messageId, messageData, lifetime) {
    // const messageUniqueId = this.configure.prefix
    //   .concat("_")
    //   .concat(JSON.stringify(messageId));

    const message = JSON.stringify(messageData);

    const stack = this.client.multi();

    // stack.del(messageUniqueId);
    stack.set(messageId, message);


    if (lifetime) {
      const lifetimeSeconds =
        this.calculateMilliseconds(lifetime)?.timestamp / 1000;

      stack.expire(messageId, lifetimeSeconds);
    }

    await stack.exec();
  }

  async select(messageId) {
    // const messageUniqueId = this.configure.prefix
    //   .concat("_")
    //   .concat(JSON.stringify(messageId));

    const raw = await this.client.multi().get(messageId).exec();

    if (!raw.length) {
      return;
    }

    logger.info(`${messageId} selected from cache`);

    return JSON.parse(raw.shift());
  }

  calculateMilliseconds(value) {
    // Get the target
    const target = Object.keys(PRIORITY_TIME_TAGS).find(
      (name) => value?.replace(/[0-9.\s]/g, "")?.toLowerCase() === name
    );

    // If we don't have a target, throw an error
    if (!target) {
      throw new Error(`Your date "${value}" is not valid for conversion`);
    }

    // Get the base value
    const baseValue = PRIORITY_TIME_TAGS[target];

    // Clear the value
    const clearedValue = Number(value.replace(/[^\d.-]/g, ""));

    // Calculate the timestamp
    const timestamp = baseValue * clearedValue;

    return {
      timestamp,
      human: `${clearedValue} ${TIME_TAGS_HUMAN[target]} / ${timestamp} ms`,
    };
  }
}

export const RedisManager = new Redis();
