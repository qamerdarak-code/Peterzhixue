function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
      },
    });
  }

  return sendJson(res, 200, {
    success: true,
    deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
    region: process.env.VERCEL_REGION || "hkg1",
    timestamp: new Date().toISOString(),
  });
};
