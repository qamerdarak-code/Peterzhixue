const { getRuntime } = require("../../server/runtime");
const {
  sendJson,
  readJsonBody,
  clientIp,
  anonymousUser,
  methodNotAllowed,
  handleError,
} = require("../../server/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);
  let questionId = "";
  try {
    const body = await readJsonBody(req);
    questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
    const regenerate = body.regenerate === true;
    const result = await getRuntime().service.explain({
      questionId,
      regenerate,
      ip: clientIp(req),
      userId: anonymousUser(req),
    });
    return sendJson(res, 200, result);
  } catch (error) {
    return handleError(res, error, { questionId });
  }
};
