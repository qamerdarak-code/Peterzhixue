const test = require("node:test");
const assert = require("node:assert/strict");
const { createDeepSeekClient } = require("../server/ai/deepseek-client");

const baseConfig = {
  apiKey: "test-only-key",
  baseUrl: "https://example.invalid",
  model: "test-model",
  temperature: 0.2,
  maxTokens: 1400,
  timeoutMs: 10,
  maxAttempts: 1,
};

test("missing API key returns a friendly configuration error", async () => {
  const client = createDeepSeekClient({ ...baseConfig, apiKey: "" }, { fetchImpl: async () => { throw new Error("unused"); } });
  await assert.rejects(client.generate({}), { code: "AI_NOT_CONFIGURED" });
});

test("timeout returns a friendly timeout error", async () => {
  const fetchImpl = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    });
  });
  const client = createDeepSeekClient(baseConfig, { fetchImpl });
  await assert.rejects(client.generate({ questionId: "test" }), { code: "AI_TIMEOUT" });
});

test("valid DeepSeek response returns content and usage", async () => {
  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return { choices: [{ message: { content: '{"officialAnswer":"B"}' } }], usage: { total_tokens: 10 }, model: "test-model" };
    },
  });
  const client = createDeepSeekClient(baseConfig, { fetchImpl });
  const result = await client.generate({ questionId: "test" });
  assert.equal(result.content, '{"officialAnswer":"B"}');
  assert.equal(result.usage.total_tokens, 10);
});
