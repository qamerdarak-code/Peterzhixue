const { AppError } = require("../errors");
const { SYSTEM_PROMPT } = require("../prompts/ai-explanation-v1");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDeepSeekClient(config, options = {}) {
  const fetchImpl = options.fetchImpl || global.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("This runtime does not provide fetch.");
  }

  async function generate(questionContext, repairInstruction = "") {
    if (!config.apiKey) {
      throw new AppError("AI_NOT_CONFIGURED", "AI解析尚未完成服务端配置。", 503);
    }
    const userContent = repairInstruction
      ? `${repairInstruction}\n\n题目上下文：\n${JSON.stringify(questionContext)}`
      : `请解析下面这道题，只返回合法JSON对象：\n${JSON.stringify(questionContext)}`;
    const body = {
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
      response_format: { type: "json_object" },
    };

    let lastError = null;
    for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new AppError("AI_REQUEST_REJECTED", "AI解析请求未被服务接受。", 502);
          }
          throw new Error(`Upstream status ${response.status}`);
        }
        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content !== "string" || !content.trim()) throw new Error("Empty model response");
        return {
          content,
          usage: payload.usage || {},
          model: payload.model || config.model,
        };
      } catch (error) {
        if (error instanceof AppError) throw error;
        lastError = error;
        if (attempt < config.maxAttempts) await sleep(180 * attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    if (lastError?.name === "AbortError") {
      throw new AppError("AI_TIMEOUT", "AI解析响应超时，请稍后重试。", 504);
    }
    throw new AppError("AI_SERVICE_UNAVAILABLE", "AI解析暂时不可用，请稍后重试。", 503);
  }

  return { generate };
}

module.exports = { createDeepSeekClient };
