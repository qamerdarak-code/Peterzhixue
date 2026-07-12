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

    const maxAttempts = Math.min(2, Math.max(1, Number(config.maxAttempts) || 2));
    const totalTimeoutMs = Math.max(1, Number(config.timeoutMs) || 18000);
    const connectTimeoutMs = Math.min(
      totalTimeoutMs,
      Math.max(1, Number(config.connectTimeoutMs) || 5000),
    );
    let lastFailure = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      let timeoutType = "";
      const connectTimer = setTimeout(() => {
        timeoutType = "connect";
        controller.abort();
      }, connectTimeoutMs);
      const totalTimer = setTimeout(() => {
        timeoutType = "total";
        controller.abort();
      }, totalTimeoutMs);
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
        clearTimeout(connectTimer);
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new AppError("AI_AUTH_ERROR", "DeepSeek服务认证失败，请联系管理员更新配置。", 502);
          }
          if (response.status === 402) {
            throw new AppError("AI_BALANCE_ERROR", "DeepSeek服务余额不足，请联系管理员处理。", 503);
          }
          if ([400, 404, 422].includes(response.status)) {
            throw new AppError("AI_REQUEST_REJECTED", "DeepSeek请求配置异常，请联系管理员检查模型设置。", 502);
          }
          const upstreamError = new Error("DeepSeek upstream request failed");
          upstreamError.upstreamStatus = response.status;
          throw upstreamError;
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
        lastFailure = {
          error,
          timeoutType: error?.name === "AbortError" ? (timeoutType || "total") : "",
          upstreamStatus: Number(error?.upstreamStatus) || 0,
        };
        if (attempt < maxAttempts) await sleep(250 * attempt);
      } finally {
        clearTimeout(connectTimer);
        clearTimeout(totalTimer);
      }
    }

    if (lastFailure?.timeoutType === "connect") {
      throw new AppError("AI_CONNECT_TIMEOUT", "连接DeepSeek服务超时，请稍后重试。", 504);
    }
    if (lastFailure?.timeoutType === "total") {
      throw new AppError("AI_TIMEOUT", "AI解析响应超时，请稍后重试。", 504);
    }
    if (lastFailure?.upstreamStatus === 429) {
      throw new AppError("AI_UPSTREAM_RATE_LIMITED", "DeepSeek当前请求繁忙，请稍后重试。", 503);
    }
    throw new AppError("AI_SERVICE_UNAVAILABLE", "AI解析暂时不可用，请稍后重试。", 503);
  }

  return { generate };
}

module.exports = { createDeepSeekClient };
