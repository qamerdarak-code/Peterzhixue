const { AppError, publicError } = require("./errors");

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function sendJson(res, status, body) {
  setJsonHeaders(res);
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

async function readJsonBody(req, maxBytes = 8192) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new AppError("INVALID_JSON", "请求格式不正确。", 400);
    }
  }
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) {
      throw new AppError("REQUEST_TOO_LARGE", "请求内容过大。", 413);
    }
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError("INVALID_JSON", "请求格式不正确。", 400);
  }
}

function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "anonymous";
}

function anonymousUser(req) {
  const value = req.headers?.["x-pete-anon"];
  if (typeof value === "string" && /^[A-Za-z0-9._:-]{8,100}$/.test(value)) return value;
  return clientIp(req);
}

function methodNotAllowed(res) {
  sendJson(res, 405, {
    success: false,
    error: { code: "METHOD_NOT_ALLOWED", message: "请求方法不支持。" },
  });
}

function handleError(res, error, context = {}) {
  const payload = publicError(error);
  console.error(JSON.stringify({
    event: "ai_api_error",
    questionId: context.questionId || null,
    code: error?.code || "INTERNAL_ERROR",
    success: false,
  }));
  sendJson(res, payload.status, payload.body);
}

module.exports = {
  sendJson,
  readJsonBody,
  clientIp,
  anonymousUser,
  methodNotAllowed,
  handleError,
};
