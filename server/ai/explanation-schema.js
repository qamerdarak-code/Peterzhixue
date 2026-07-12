const { AppError } = require("../errors");

const JUDGMENTS = new Set(["正确", "错误", "有争议"]);

function cleanText(value, maxLength = 2400) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxLength);
}

function cleanStringArray(value, min, max, fallback = []) {
  const items = Array.isArray(value)
    ? value.map((item) => cleanText(item, 700)).filter(Boolean).slice(0, max)
    : [];
  while (items.length < min && fallback[items.length]) items.push(fallback[items.length]);
  return items;
}

function stripCodeFence(value) {
  const text = String(value || "").trim();
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function parseModelJson(value) {
  try {
    return JSON.parse(stripCodeFence(value));
  } catch {
    throw new AppError("AI_INVALID_RESPONSE", "AI解析返回格式异常，请重试。", 502);
  }
}

function normalizeExplanation(raw, questionContext) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AppError("AI_INVALID_RESPONSE", "AI解析返回格式异常，请重试。", 502);
  }
  const officialAnswer = String(questionContext.officialAnswer || "");
  const optionKeys = Object.keys(questionContext.options || {});
  let needsReview = Boolean(raw.needsReview);
  let reviewReason = cleanText(raw.reviewReason, 1000);
  if (cleanText(raw.officialAnswer, 80) !== officialAnswer) {
    needsReview = true;
    reviewReason = reviewReason || "AI返回的答案与题库官方答案不一致，已由服务端恢复为官方答案。";
  }

  const analysisByOption = new Map();
  if (Array.isArray(raw.optionAnalysis)) {
    for (const item of raw.optionAnalysis) {
      const option = cleanText(item?.option, 20).toUpperCase();
      if (!optionKeys.includes(option) || analysisByOption.has(option)) continue;
      analysisByOption.set(option, {
        option,
        judgment: JUDGMENTS.has(item?.judgment) ? item.judgment : "有争议",
        explanation: cleanText(item?.explanation, 1400),
      });
    }
  }
  const optionAnalysis = optionKeys.map((option) => {
    const item = analysisByOption.get(option);
    if (item?.explanation) return item;
    needsReview = true;
    reviewReason = reviewReason || "AI未完整覆盖全部选项，已标记人工核验。";
    return {
      option,
      judgment: officialAnswer.includes(option) ? "正确" : "错误",
      explanation: "该选项的解析内容缺失，建议结合课程资料核验。",
    };
  });

  const confidenceNumber = Number(raw.confidence);
  const confidence = Number.isFinite(confidenceNumber)
    ? Math.min(1, Math.max(0, confidenceNumber))
    : 0.5;
  if (!Number.isFinite(confidenceNumber) || confidence < 0.55) {
    needsReview = true;
    reviewReason = reviewReason || "AI对本题解析的置信度较低。";
  }

  const conclusion = cleanText(raw.conclusion, 700) || `本题题库官方答案为${officialAnswer}。`;
  const coreReasoning = cleanStringArray(raw.coreReasoning, 2, 4, [
    `先确认题库官方答案为${officialAnswer}。`,
    "再结合题干条件逐项排除不符合的选项。",
  ]);
  const knowledgePoints = cleanStringArray(raw.knowledgePoints, 2, 5, [
    questionContext.knowledgePoint || questionContext.chapter || "本题核心考点",
    "选项间的关键鉴别点",
  ]);

  return {
    officialAnswer,
    conclusion,
    coreReasoning,
    optionAnalysis,
    knowledgePoints,
    commonMistake: cleanText(raw.commonMistake, 1200),
    mnemonic: cleanText(raw.mnemonic, 600),
    confidence,
    needsReview,
    reviewReason: needsReview ? (reviewReason || "本题解析建议进一步人工核验。") : "",
  };
}

module.exports = {
  cleanText,
  stripCodeFence,
  parseModelJson,
  normalizeExplanation,
};
