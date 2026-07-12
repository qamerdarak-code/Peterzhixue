const crypto = require("node:crypto");
const { AppError } = require("./errors");

function keyHash(value) {
  return crypto.createHash("sha256").update(String(value || "anonymous")).digest("hex").slice(0, 24);
}

function createRateLimiter(store, config) {
  async function consume({ ip, userId }) {
    const minute = Math.floor(Date.now() / 60000);
    const day = new Date().toISOString().slice(0, 10);
    const ipKey = `ai:rate:ip:${keyHash(ip)}:${minute}`;
    const userKey = `ai:rate:user:${keyHash(userId || ip)}:${day}`;
    const ipCount = await store.increment(ipKey, 120);
    if (ipCount > config.ipPerMinute) {
      throw new AppError("RATE_LIMITED", "AI解析请求过于频繁，请稍后再试。", 429);
    }
    const userCount = await store.increment(userKey, 60 * 60 * 48);
    if (userCount > config.userPerDay) {
      throw new AppError("DAILY_LIMIT_REACHED", "今天的AI解析生成次数已用完，缓存解析仍可正常查看。", 429);
    }
    return { ipCount, userCount };
  }
  return { consume };
}

module.exports = { createRateLimiter, keyHash };
