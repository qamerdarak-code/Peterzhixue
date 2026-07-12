const { getRuntime } = require("../../server/runtime");
const {
  sendJson,
  readJsonBody,
  setCorsHeaders,
  handleOptions,
  methodNotAllowed,
  handleError,
} = require("../../server/http");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return handleOptions(req, res);
  setCorsHeaders(req, res);
  if (req.method !== "POST") return methodNotAllowed(res);
  let questionId = "";
  try {
    const body = await readJsonBody(req);
    questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";
    const result = await getRuntime().service.feedback({ questionId, type });
    return sendJson(res, 200, result);
  } catch (error) {
    return handleError(res, error, { questionId });
  }
};
