const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { AppError } = require("./errors");

let subjectsCache = null;
let questionIndexCache = null;

function loadSubjects() {
  if (subjectsCache) return subjectsCache;
  const sourcePath = path.join(process.cwd(), "public", "questions.js");
  const code = fs.readFileSync(sourcePath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: sourcePath, timeout: 5000 });
  subjectsCache = sandbox.window.PETE_SUBJECTS || {};
  return subjectsCache;
}

function buildQuestionIndex() {
  if (questionIndexCache) return questionIndexCache;
  questionIndexCache = new Map();
  for (const [subjectId, subject] of Object.entries(loadSubjects())) {
    for (const question of subject.questions || []) {
      if (questionIndexCache.has(question.id)) {
        throw new AppError("QUESTION_ID_CONFLICT", "题库存在重复题目编号。", 500);
      }
      questionIndexCache.set(question.id, { subjectId, subject, question });
    }
  }
  return questionIndexCache;
}

function findQuestion(questionId) {
  return buildQuestionIndex().get(questionId) || null;
}

function requireQuestion(questionId) {
  if (typeof questionId !== "string" || !/^[A-Za-z0-9._:-]{1,160}$/.test(questionId)) {
    throw new AppError("INVALID_QUESTION_ID", "题目编号格式不正确。", 400);
  }
  const found = findQuestion(questionId);
  if (!found) throw new AppError("QUESTION_NOT_FOUND", "没有找到这道题。", 404);
  if (!found.question.answer) throw new AppError("ANSWER_UNAVAILABLE", "这道题的答案仍在校对中。", 409);
  return found;
}

function questionType(question) {
  if (question.type === "multiple" || String(question.answer || "").length > 1) return "multiple_choice";
  if (question.type === "fill" || question.type === "blank") return "fill_blank";
  if (question.type === "judge") return "true_false";
  return "single_choice";
}

function toModelContext(found) {
  const { subject, question } = found;
  return {
    questionId: question.id,
    subject: subject.meta?.subject || "",
    chapter: (question.knowledge || [])[0] || "",
    knowledgePoint: (question.knowledge || []).join("；"),
    questionType: questionType(question),
    stem: question.stem || "",
    options: question.options || {},
    officialAnswer: String(question.answer || ""),
    existingOfficialExplanation: question.explanation || "",
    source: question.source || "",
  };
}

function resetRepositoryForTests() {
  subjectsCache = null;
  questionIndexCache = null;
}

module.exports = {
  loadSubjects,
  findQuestion,
  requireQuestion,
  toModelContext,
  resetRepositoryForTests,
};
