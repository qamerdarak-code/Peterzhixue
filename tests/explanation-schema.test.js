const test = require("node:test");
const assert = require("node:assert/strict");
const { parseModelJson, normalizeExplanation } = require("../server/ai/explanation-schema");

const context = {
  officialAnswer: "B",
  options: { A: "选项A", B: "选项B", C: "选项C", D: "选项D" },
  knowledgePoint: "测试知识点",
  chapter: "测试章节",
};

function validRaw() {
  return {
    officialAnswer: "B",
    conclusion: "本题选择B。",
    coreReasoning: ["理由一", "理由二"],
    optionAnalysis: [
      { option: "A", judgment: "错误", explanation: "A错误" },
      { option: "B", judgment: "正确", explanation: "B正确" },
      { option: "C", judgment: "错误", explanation: "C错误" },
      { option: "D", judgment: "错误", explanation: "D错误" },
    ],
    knowledgePoints: ["知识点一", "知识点二"],
    commonMistake: "易错点",
    mnemonic: "记忆提示",
    confidence: 0.9,
    needsReview: false,
    reviewReason: "",
  };
}

test("parses JSON output wrapped in a code fence", () => {
  const result = parseModelJson(`\`\`\`json\n${JSON.stringify(validRaw())}\n\`\`\``);
  assert.equal(result.officialAnswer, "B");
});

test("server official answer overrides a model answer change", () => {
  const raw = validRaw();
  raw.officialAnswer = "A";
  const result = normalizeExplanation(raw, context);
  assert.equal(result.officialAnswer, "B");
  assert.equal(result.needsReview, true);
  assert.match(result.reviewReason, /官方答案/);
});

test("missing option analysis is repaired and marked for review", () => {
  const raw = validRaw();
  raw.optionAnalysis = raw.optionAnalysis.slice(0, 2);
  const result = normalizeExplanation(raw, context);
  assert.equal(result.optionAnalysis.length, 4);
  assert.equal(result.needsReview, true);
});

test("low confidence is marked for review", () => {
  const raw = validRaw();
  raw.confidence = 0.3;
  const result = normalizeExplanation(raw, context);
  assert.equal(result.needsReview, true);
});

test("model HTML remains inert text for the frontend textContent renderer", () => {
  const raw = validRaw();
  raw.conclusion = '<img src=x onerror="alert(1)">';
  const result = normalizeExplanation(raw, context);
  assert.equal(result.conclusion, '<img src=x onerror="alert(1)">');
});

test("invalid JSON is rejected", () => {
  assert.throws(() => parseModelJson("not json"), { code: "AI_INVALID_RESPONSE" });
});
