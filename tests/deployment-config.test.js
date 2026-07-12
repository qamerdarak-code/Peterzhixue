const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("frontend AI requests are same-origin and contain no vercel.app host", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("app.js", "utf8");
  assert.doesNotMatch(`${html}\n${app}`, /vercel\.app/i);
  assert.match(app, /fetch\("\/api\/ai\/explain"/);
  assert.doesNotMatch(app, /fetch\([^)]*https?:\/\//i);
});

test("Vercel keeps API routes on functions and uses the Hong Kong region", () => {
  const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  assert.deepEqual(config.regions, ["hkg1"]);
  assert.deepEqual(config.functions["api/**/*.js"].regions, ["hkg1"]);
  assert.equal(config.builds, undefined);
  assert.equal(config.outputDirectory, undefined);
  const fallback = config.rewrites.find((rewrite) => rewrite.destination === "/index.html");
  assert.ok(fallback);
  const fallbackPattern = new RegExp(`^${fallback.source}$`);
  assert.equal(fallbackPattern.test("/subjects/medical-psychology"), true);
  assert.equal(fallbackPattern.test("/api/health"), false);
  assert.equal(fallbackPattern.test("/api/ai/explain"), false);
});

test("health endpoint reports configuration state without exposing the key", async () => {
  const previousKey = process.env.DEEPSEEK_API_KEY;
  const previousRegion = process.env.VERCEL_REGION;
  process.env.DEEPSEEK_API_KEY = "test-secret-never-returned";
  process.env.VERCEL_REGION = "hkg1";
  const handler = require("../api/health");
  const headers = {};
  let body = "";
  const req = { method: "GET" };
  const res = {
    statusCode: 0,
    setHeader(name, value) { headers[name] = value; },
    end(value = "") { body = value; },
  };
  await handler(req, res);
  const payload = JSON.parse(body);
  assert.equal(res.statusCode, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.deepseekConfigured, true);
  assert.equal(payload.region, "hkg1");
  assert.ok(payload.timestamp);
  assert.doesNotMatch(body, /test-secret-never-returned/);
  if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = previousKey;
  if (previousRegion === undefined) delete process.env.VERCEL_REGION;
  else process.env.VERCEL_REGION = previousRegion;
});

test("health endpoint returns the required 405 payload for non-GET methods", async () => {
  const handler = require("../api/health");
  let body = "";
  const res = {
    statusCode: 0,
    setHeader() {},
    end(value = "") { body = value; },
  };
  await handler({ method: "POST" }, res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(JSON.parse(body), {
    success: false,
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed",
    },
  });
});
