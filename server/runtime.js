const repository = require("./question-repository");
const { loadConfig } = require("./config");
const { DataStore } = require("./data/store");
const { createRateLimiter } = require("./rate-limit");
const { createDeepSeekClient } = require("./ai/deepseek-client");
const { createExplanationService } = require("./services/explanation-service");

function createRuntime() {
  const config = loadConfig();
  const store = new DataStore(config.datastore);
  const rateLimiter = createRateLimiter(store, config.rateLimit);
  const aiClient = createDeepSeekClient(config.deepseek);
  const service = createExplanationService({
    repository,
    store,
    rateLimiter,
    aiClient,
    config,
  });
  return { config, store, service };
}

function getRuntime() {
  if (!globalThis.__PETER_AI_RUNTIME__) globalThis.__PETER_AI_RUNTIME__ = createRuntime();
  return globalThis.__PETER_AI_RUNTIME__;
}

module.exports = { createRuntime, getRuntime };
