function numberFromEnv(name, fallback, min, max) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function loadConfig() {
  return {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      temperature: numberFromEnv("DEEPSEEK_TEMPERATURE", 0.2, 0, 1),
      maxTokens: numberFromEnv("DEEPSEEK_MAX_TOKENS", 1400, 300, 4000),
      connectTimeoutMs: numberFromEnv("DEEPSEEK_CONNECT_TIMEOUT_MS", 5000, 1000, 20000),
      timeoutMs: numberFromEnv(
        "DEEPSEEK_TOTAL_TIMEOUT_MS",
        numberFromEnv("DEEPSEEK_TIMEOUT_MS", 18000, 3000, 60000),
        3000,
        60000,
      ),
      maxAttempts: 2,
    },
    cache: {
      ttlSeconds: numberFromEnv("AI_CACHE_TTL_SECONDS", 60 * 60 * 24 * 180, 60, 60 * 60 * 24 * 365),
    },
    rateLimit: {
      ipPerMinute: numberFromEnv("AI_RATE_LIMIT_IP_PER_MINUTE", 5, 1, 100),
      userPerDay: numberFromEnv("AI_RATE_LIMIT_USER_PER_DAY", 20, 1, 1000),
    },
    datastore: {
      url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
      localFile: process.env.AI_LOCAL_DATA_FILE || ".data/ai-store.json",
      production: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
    },
  };
}

module.exports = { loadConfig, numberFromEnv };
