const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter } = require("../server/rate-limit");

test("per-IP rate limit is enforced", async () => {
  const values = new Map();
  const store = {
    async increment(key) {
      const next = (values.get(key) || 0) + 1;
      values.set(key, next);
      return next;
    },
  };
  const limiter = createRateLimiter(store, { ipPerMinute: 1, userPerDay: 20 });
  await limiter.consume({ ip: "1.1.1.1", userId: "user" });
  await assert.rejects(limiter.consume({ ip: "1.1.1.1", userId: "user" }), { code: "RATE_LIMITED" });
});
