const test = require("node:test");
const assert = require("node:assert/strict");
const { createExplanationService } = require("../server/services/explanation-service");
const { AppError } = require("../server/errors");

class MemoryStore {
  constructor() { this.values = new Map(); }
  async getJson(key) { return this.values.get(key) || null; }
  async setJson(key, value) { this.values.set(key, value); }
  async increment(key) {
    const next = Number(this.values.get(key) || 0) + 1;
    this.values.set(key, next);
    return next;
  }
}

const questionContext = {
  questionId: "test-001",
  subject: "医学心理学",
  chapter: "绪论",
  knowledgePoint: "研究任务",
  questionType: "single_choice",
  stem: "测试题干",
  options: { A: "A项", B: "B项" },
  officialAnswer: "B",
  existingOfficialExplanation: "官方解析",
  source: "原题",
};

function modelContent(overrides = {}) {
  return JSON.stringify({
    officialAnswer: "B",
    conclusion: "本题选择B。",
    coreReasoning: ["理由一", "理由二"],
    optionAnalysis: [
      { option: "A", judgment: "错误", explanation: "A错误" },
      { option: "B", judgment: "正确", explanation: "B正确" },
    ],
    knowledgePoints: ["知识点一", "知识点二"],
    commonMistake: "易错点",
    mnemonic: "记忆提示",
    confidence: 0.9,
    needsReview: false,
    reviewReason: "",
    ...overrides,
  });
}

function setup({ aiContent = modelContent(), rateLimiter = { consume: async () => ({}) } } = {}) {
  const store = new MemoryStore();
  let aiCalls = 0;
  const repository = {
    requireQuestion(id) {
      if (id !== "test-001") throw new AppError("QUESTION_NOT_FOUND", "没有找到这道题。", 404);
      return { question: { id }, subject: {} };
    },
    toModelContext() { return questionContext; },
  };
  const service = createExplanationService({
    repository,
    store,
    rateLimiter,
    aiClient: {
      async generate() {
        aiCalls += 1;
        return { content: aiContent, usage: { total_tokens: 120 }, model: "test-model" };
      },
    },
    config: {
      deepseek: { model: "test-model" },
      cache: { ttlSeconds: 3600 },
    },
    logger: { info() {} },
  });
  return { service, store, getAiCalls: () => aiCalls };
}

test("generates a structured explanation and then hits cache", async () => {
  const { service, getAiCalls } = setup();
  const first = await service.explain({ questionId: "test-001", ip: "1.1.1.1", userId: "user" });
  const second = await service.explain({ questionId: "test-001", ip: "1.1.1.1", userId: "user" });
  assert.equal(first.source, "generated");
  assert.equal(second.source, "cache");
  assert.equal(second.explanation.officialAnswer, "B");
  assert.equal(getAiCalls(), 1);
});

test("regenerate bypasses cache and counts as a new generation", async () => {
  const { service, getAiCalls } = setup();
  await service.explain({ questionId: "test-001", ip: "1", userId: "u" });
  await service.explain({ questionId: "test-001", regenerate: true, ip: "1", userId: "u" });
  assert.equal(getAiCalls(), 2);
});

test("question not found is rejected before calling AI", async () => {
  const { service, getAiCalls } = setup();
  await assert.rejects(service.explain({ questionId: "missing", ip: "1", userId: "u" }), { code: "QUESTION_NOT_FOUND" });
  assert.equal(getAiCalls(), 0);
});

test("rate limit failure blocks generation", async () => {
  const { service, getAiCalls } = setup({
    rateLimiter: { consume: async () => { throw new AppError("RATE_LIMITED", "请求过于频繁", 429); } },
  });
  await assert.rejects(service.explain({ questionId: "test-001", ip: "1", userId: "u" }), { code: "RATE_LIMITED" });
  assert.equal(getAiCalls(), 0);
});

test("feedback is stored without calling AI", async () => {
  const { service, getAiCalls } = setup();
  const result = await service.feedback({ questionId: "test-001", type: "incorrect" });
  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.equal(getAiCalls(), 0);
});
