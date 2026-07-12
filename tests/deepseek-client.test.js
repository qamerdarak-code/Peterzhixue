const test = require("node:test");
const assert = require("node:assert/strict");
const { createDeepSeekClient } = require("../server/ai/deepseek-client");

const baseConfig = {
  apiKey: "test-only-key",
  baseUrl: "https://example.invalid",
  model: "test-model",
  temperature: 0.2,
  maxTokens: 1400,
  connectTimeoutMs: 5,
  timeoutMs: 10,
  maxAttempts: 1,
};

test("missing API key returns a friendly configuration error", async () => {
  const client = createDeepSeekClient({ ...baseConfig, apiKey: "" }, { fetchImpl: async () => { throw new Error("unused"); } });
  await assert.rejects(client.generate({}), { code: "AI_NOT_CONFIGURED" });
});

test("timeout returns a friendly timeout error", async () => {
  const fetchImpl = async (_url, options) => ({
    ok: true,
    json: () => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    }),
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

test("authentication and balance errors are distinguished without leaking credentials", async () => {
  for (const [status, code] of [[401, "AI_AUTH_ERROR"], [402, "AI_BALANCE_ERROR"]]) {
    const client = createDeepSeekClient(baseConfig, {
      fetchImpl: async () => ({ ok: false, status }),
    });
    await assert.rejects(client.generate({ questionId: "test" }), { code });
  }
});

test("a transient upstream failure is retried at most once", async () => {
  let calls = 0;
  const client = createDeepSeekClient({ ...baseConfig, maxAttempts: 5 }, {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 503 };
      return {
        ok: true,
        async json() {
          return { choices: [{ message: { content: '{"officialAnswer":"B"}' } }] };
        },
      };
    },
  });
  const result = await client.generate({ questionId: "test" });
  assert.equal(result.content, '{"officialAnswer":"B"}');
  assert.equal(calls, 2);
});

test("connection timeout has a dedicated public error", async () => {
  const fetchImpl = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    });
  });
  const client = createDeepSeekClient({ ...baseConfig, connectTimeoutMs: 2, timeoutMs: 20 }, { fetchImpl });
  await assert.rejects(client.generate({ questionId: "test" }), { code: "AI_CONNECT_TIMEOUT" });
});
