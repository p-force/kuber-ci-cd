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

  async connect() {
    try {
      const url = `rediss://default:AZktAAIncDFkMzlmZjRiYTNiYmQ0MjE0YjNlYjM5NmJmYjljZmJiNHAxMzkyMTM@moral-crane-39213.upstash.io:6379`;
      // const url = "rediss://default:AXkyAAIncDE4ZDQzZTI0MGFkNDg0ODlhOWI3NDIwZmZkMzE3YjQ3N3AxMzEwMjY@leading-cat-31026.upstash.io:6379"

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
   * @param messageArray {Array}
   * @param lifetime {string}
   */
  async setList(messageId, messageArray, lifetime) {
    const key =
      typeof messageId === "string" ? messageId : JSON.stringify(messageId);

    const stack = this.client.multi();

    // Удалить существующий список или данные по этому ключу перед добавлением новых элементов
    stack.del(key);

    for (let item of messageArray) {
      stack.rPush(key, item);
    }

    if (lifetime) {
      const lifetimeSeconds =
        this.calculateMilliseconds(lifetime)?.timestamp / 1; 

      stack.expire(key, lifetimeSeconds);
    }

    await stack.exec();
  }

  async select(messageId) {
    const key =
      typeof messageId === "string" ? messageId : JSON.stringify(messageId);

    const list = await this.client.lRange(key, 0, -1);
    if (!list.length) {
      return;
    }

    logger.info(`${messageId} selected from cache`);
    return list;
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
