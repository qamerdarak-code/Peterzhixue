const test = require("node:test");
const assert = require("node:assert/strict");
const repository = require("../server/question-repository");

test("server question repository loads all subjects and official answers", () => {
  const subjects = repository.loadSubjects();
  const firstSubject = Object.values(subjects)[0];
  const firstQuestion = firstSubject.questions.find((question) => question.answer);
  const found = repository.requireQuestion(firstQuestion.id);
  const context = repository.toModelContext(found);
  assert.equal(context.questionId, firstQuestion.id);
  assert.equal(context.officialAnswer, firstQuestion.answer);
  assert.ok(context.stem);
});

test("unknown question id returns 404 style error", () => {
  assert.throws(() => repository.requireQuestion("not-a-real-question"), { code: "QUESTION_NOT_FOUND", status: 404 });
});
