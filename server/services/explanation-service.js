const crypto = require("node:crypto");
const { AppError } = require("../errors");
const { parseModelJson, normalizeExplanation } = require("../ai/explanation-schema");
const { PROMPT_VERSION } = require("../prompts/ai-explanation-v1");

function contentHash(context) {
  const content = JSON.stringify({
    questionId: context.questionId,
    subject: context.subject,
    chapter: context.chapter,
    questionType: context.questionType,
    stem: context.stem,
    options: context.options,
    officialAnswer: context.officialAnswer,
    existingOfficialExplanation: context.existingOfficialExplanation,
    source: context.source,
  });
  return crypto.createHash("sha256").update(content).digest("hex");
}

function createExplanationService(dependencies) {
  const {
    repository,
    store,
    aiClient,
    rateLimiter,
    config,
    logger = console,
  } = dependencies;

  async function generateValidated(context) {
    let response = await aiClient.generate(context);
    let parsed;
    try {
      parsed = parseModelJson(response.content);
    } catch (firstError) {
      response = await aiClient.generate(
        context,
        "上一次输出无法解析。请严格按照系统要求，只返回一个字段完整的合法JSON对象。",
      );
      parsed = parseModelJson(response.content);
    }
    return {
      explanation: normalizeExplanation(parsed, context),
      usage: response.usage || {},
      model: response.model || config.deepseek.model,
    };
  }

  async function explain({ questionId, regenerate = false, ip = "", userId = "" }) {
    const startedAt = Date.now();
    const found = repository.requireQuestion(questionId);
    const context = repository.toModelContext(found);
    const hash = contentHash(context);
    const cacheIdentity = `${questionId}:${hash}:${PROMPT_VERSION}:${config.deepseek.model}`;
    const cacheKey = `ai:explanation:${crypto.createHash("sha256").update(cacheIdentity).digest("hex")}`;

    if (!regenerate) {
      const cached = await store.getJson(cacheKey);
      if (cached?.explanation) {
        logger.info(JSON.stringify({
          event: "ai_explanation",
          questionId,
          cacheHit: true,
          model: cached.model,
          durationMs: Date.now() - startedAt,
          success: true,
        }));
        return {
          success: true,
          source: cached.status === "reviewed" ? "reviewed" : "cache",
          questionId,
          explanation: cached.explanation,
        };
      }
    }

    await rateLimiter.consume({ ip, userId });
    const generated = await generateValidated(context);
    const now = new Date().toISOString();
    const record = {
      questionId,
      questionHash: hash,
      promptVersion: PROMPT_VERSION,
      model: generated.model,
      explanation: generated.explanation,
      status: generated.explanation.needsReview ? "needs_review" : "generated",
      createdAt: now,
      updatedAt: now,
    };
    await store.setJson(cacheKey, record, config.cache.ttlSeconds);
    logger.info(JSON.stringify({
      event: "ai_explanation",
      questionId,
      cacheHit: false,
      model: generated.model,
      tokenUsage: generated.usage.total_tokens || generated.usage.totalTokens || null,
      durationMs: Date.now() - startedAt,
      success: true,
    }));
    return {
      success: true,
      source: "generated",
      questionId,
      explanation: generated.explanation,
    };
  }

  async function feedback({ questionId, type }) {
    repository.requireQuestion(questionId);
    const allowed = new Set(["like", "dislike", "incorrect", "unclear", "other"]);
    if (!allowed.has(type)) throw new AppError("INVALID_FEEDBACK", "反馈类型不正确。", 400);
    const count = await store.increment(`ai:feedback:${questionId}:${type}`, 60 * 60 * 24 * 365);
    logger.info(JSON.stringify({ event: "ai_feedback", questionId, type, success: true }));
    return { success: true, questionId, type, count };
  }

  return { explain, feedback, contentHash };
}

module.exports = { createExplanationService, contentHash };
