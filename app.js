const subjects = window.PETE_SUBJECTS || { "medical-psychology": window.PETE_QUESTIONS };
let activeSubjectId = "medical-psychology";
let data = subjects[activeSubjectId];
let localQuestions = readLocalQuestions();
let questions = [...data.questions, ...normalizeImported(localQuestions)];
let filtered = [...questions];
let currentIndex = 0;
let selected = [];
let checked = false;
let practiceState = readPracticeState();
let wrongOnly = false;
let activeMineTab = "favorites";
let activeStatsScope = "subject";
const retryingQuestions = new Set();

const els = {
  homeStats: document.querySelector("#home-stats"),
  stats: document.querySelector("#stats"),
  courseEyebrow: document.querySelector("#course-eyebrow"),
  courseTitle: document.querySelector("#course-title"),
  sourceFilter: document.querySelector("#source-filter"),
  topicFilter: document.querySelector("#topic-filter"),
  searchInput: document.querySelector("#search-input"),
  shuffleBtn: document.querySelector("#shuffle-btn"),
  sourceBadge: document.querySelector("#source-badge"),
  topicBadge: document.querySelector("#topic-badge"),
  progressBadge: document.querySelector("#progress-badge"),
  stem: document.querySelector("#question-stem"),
  media: document.querySelector("#question-media"),
  options: document.querySelector("#options"),
  explanation: document.querySelector("#explanation"),
  checkBtn: document.querySelector("#check-btn"),
  prevBtn: document.querySelector("#prev-btn"),
  nextBtn: document.querySelector("#next-btn"),
  queueCount: document.querySelector("#queue-count"),
  questionList: document.querySelector("#question-list"),
  topicGrid: document.querySelector("#topic-grid"),
  importJson: document.querySelector("#import-json"),
  importBtn: document.querySelector("#import-btn"),
  resetLocalBtn: document.querySelector("#reset-local-btn"),
  sourceLog: document.querySelector("#source-log"),
  practiceSummary: document.querySelector("#practice-summary"),
  routeTransition: document.querySelector("#route-transition"),
  routeTransitionTitle: document.querySelector("#route-transition-title"),
  statsBtn: document.querySelector("#stats-btn"),
  favoriteBtn: document.querySelector("#favorite-btn"),
  annotationBtn: document.querySelector("#annotation-btn"),
  chopBtn: document.querySelector("#chop-btn"),
  mineList: document.querySelector("#mine-list"),
  favoriteCount: document.querySelector("#favorite-count"),
  choppedCount: document.querySelector("#chopped-count"),
  annotationDialog: document.querySelector("#annotation-dialog"),
  annotationQuestion: document.querySelector("#annotation-question"),
  annotationInput: document.querySelector("#annotation-input"),
  annotationSaveBtn: document.querySelector("#annotation-save-btn"),
  annotationDeleteBtn: document.querySelector("#annotation-delete-btn"),
  statsDialog: document.querySelector("#stats-dialog"),
  statsContext: document.querySelector("#stats-context"),
  statsGrid: document.querySelector("#stats-grid"),
  statsChart: document.querySelector("#stats-chart"),
  statsCloseBtn: document.querySelector("#stats-close-btn"),
  chopDialog: document.querySelector("#chop-dialog"),
  chopDialogClose: document.querySelector("#chop-dialog-close"),
  resetDialog: document.querySelector("#reset-dialog"),
  resetMessage: document.querySelector("#reset-message"),
  resetDialogCancel: document.querySelector("#reset-dialog-cancel"),
  resetDialogConfirm: document.querySelector("#reset-dialog-confirm"),
};

function readLocalQuestions(subjectId = activeSubjectId) {
  return JSON.parse(localStorage.getItem(`pete-extra-questions-${subjectId}`) || "[]");
}

function emptyPracticeState() {
  return { attempts: {}, wrongArchive: {}, chopped: {}, favorites: {}, annotations: {} };
}

function readPracticeState(subjectId = activeSubjectId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`pete-practice-state-${subjectId}`) || "{}");
    return {
      attempts: saved.attempts || {},
      wrongArchive: saved.wrongArchive || {},
      chopped: saved.chopped || {},
      favorites: saved.favorites || {},
      annotations: saved.annotations || {},
    };
  } catch {
    return emptyPracticeState();
  }
}

function savePracticeState(state = practiceState, subjectId = activeSubjectId) {
  localStorage.setItem(`pete-practice-state-${subjectId}`, JSON.stringify(state));
}

function normalizeImported(items) {
  return items
    .filter((item) => item && item.stem && (item.options || item.type === "fill" || item.type === "blank"))
    .map((item, index) => ({
      id: item.id || `local-${index + 1}`,
      source: item.source || "新编拓展题（AI深度改编）",
      sourceFile: item.sourceFile || "本地导入",
      number: item.number || index + 1,
      type: item.type || ((item.answer || "").length > 1 ? "multiple" : "single"),
      stem: item.stem,
      options: item.options || {},
      answer: item.type === "fill" || item.type === "blank" ? (item.answer || "") : (item.answer || "").toUpperCase(),
      acceptedAnswers: item.acceptedAnswers || [],
      explanation: item.explanation || "本地导入题，解析待补充。",
      knowledge: item.knowledge || ["本地扩展"],
      image: item.image || null,
    }));
}

function questionsForSubject(subjectId) {
  const subject = subjects[subjectId];
  if (!subject) return [];
  return [...subject.questions, ...normalizeImported(readLocalQuestions(subjectId))];
}

function questionById(subjectId, questionId) {
  return questionsForSubject(subjectId).find((question) => question.id === questionId);
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

function setToolState(button, active, activeIcon = null, inactiveIcon = null) {
  if (!button) return;
  button.classList.toggle("active", Boolean(active));
  button.setAttribute("aria-pressed", String(Boolean(active)));
  const icon = button.querySelector("img");
  if (icon && activeIcon && inactiveIcon) icon.src = active ? activeIcon : inactiveIcon;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => (
    {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[char]
  ));
}

function optionAnswer(answer, q = null) {
  if (!answer) return "";
  if (isFillQuestion(q)) return answer;
  return answer.length > 1 ? answer.split("").join(" / ") : answer;
}

function answerKeys(value) {
  return (value || "").split("").filter(Boolean).sort();
}

function normalizeSelection(value) {
  if (Array.isArray(value)) return [...new Set(value)].sort();
  return (value || "").split("").filter(Boolean).sort();
}

function selectionValue() {
  return normalizeSelection(selected).join("");
}

function isMultipleQuestion(q) {
  return !isFillQuestion(q) && (q?.type === "multiple" || (q?.answer || "").length > 1);
}

function isFillQuestion(q) {
  return q?.type === "fill" || q?.type === "blank";
}

function normalizeFillAnswer(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[（(].*?[)）]/g, "")
    .replace(/[\s,，.。;；:：、·\-—_/\\]/g, "")
    .trim();
}

function fillAnswers(q) {
  return [q?.answer, ...(q?.acceptedAnswers || [])].filter(Boolean);
}

function isFillAnswerCorrect(q, value) {
  const normalized = normalizeFillAnswer(value);
  return Boolean(normalized && fillAnswers(q).some((answer) => normalizeFillAnswer(answer) === normalized));
}

function getPracticeTotals(state = practiceState) {
  const records = Object.values(state.attempts);
  const totalAttempts = records.reduce((sum, item) => sum + (item.attempts || 0), 0);
  const correctAttempts = records.reduce((sum, item) => sum + (item.correct || 0), 0);
  const doneQuestions = records.length;
  const wrongQuestions = Object.keys(state.wrongArchive).length;
  const choppedQuestions = Object.keys(state.chopped).length;
  const favoriteQuestions = Object.keys(state.favorites).length;
  const annotatedQuestions = Object.keys(state.annotations).length;
  const accuracy = totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  return {
    totalAttempts,
    correctAttempts,
    doneQuestions,
    wrongQuestions,
    choppedQuestions,
    favoriteQuestions,
    annotatedQuestions,
    accuracy,
  };
}

function recordAttempt(q, choice, isCorrect) {
  if (!q || !q.answer || !choice) return;
  const previous = practiceState.attempts[q.id] || {
    attempts: 0,
    correct: 0,
    wrong: 0,
  };
  const record = {
    ...previous,
    attempts: previous.attempts + 1,
    correct: previous.correct + (isCorrect ? 1 : 0),
    wrong: previous.wrong + (isCorrect ? 0 : 1),
    lastSelected: choice,
    lastCorrect: isCorrect,
    lastAt: new Date().toISOString(),
  };
  practiceState.attempts[q.id] = record;
  if (!isCorrect) {
    practiceState.wrongArchive[q.id] = {
      id: q.id,
      stem: q.stem,
      answer: q.answer,
      selected: choice,
      source: q.source,
      topic: (q.knowledge || [])[0] || "",
      at: record.lastAt,
    };
  }
  savePracticeState();
}

function renderPracticeSummary() {
  if (!els.practiceSummary) return;
  const totals = getPracticeTotals();
  els.practiceSummary.innerHTML = `
    <div class="summary-metric"><span>已做题目</span><strong>${totals.doneQuestions}</strong></div>
    <div class="summary-metric"><span>提交次数</span><strong>${totals.totalAttempts}</strong></div>
    <div class="summary-metric"><span>正确率</span><strong>${totals.accuracy}%</strong></div>
    <button class="wrong-book ${wrongOnly ? "active" : ""}" id="wrong-only-btn" ${totals.wrongQuestions ? "" : "disabled"}>
      错题本 ${totals.wrongQuestions}
    </button>
    <button class="summary-icon-action" id="reset-practice-btn" aria-label="重置练习" data-tooltip="重置练习" ${(totals.totalAttempts || totals.choppedQuestions) ? "" : "disabled"}>
      <img src="./public/icons/rotate-ccw.svg" alt="" aria-hidden="true" />
    </button>
  `;
  const wrongBtn = document.querySelector("#wrong-only-btn");
  wrongBtn?.addEventListener("click", () => {
    wrongOnly = !wrongOnly;
    applyFilters();
  });
  document.querySelector("#reset-practice-btn")?.addEventListener("click", resetPracticeState);
}

function renderStats() {
  const original = questions.filter((q) => q.source.includes("原题")).length;
  const ai = questions.filter((q) => q.source.includes("新编")).length;
  const todo = questions.filter((q) => !q.answer).length;
  const totals = getPracticeTotals();
  const markup = `
    <span>原题 ${original}</span>
    <span>新编 ${ai}</span>
    <span>待核验 ${todo}</span>
    <span>正确率 ${totals.accuracy}%</span>
    <span>错题 ${totals.wrongQuestions}</span>
  `;
  els.stats.innerHTML = markup;
  if (els.homeStats) {
    const subjectCount = Object.keys(subjects).length;
    const total = Object.values(subjects).reduce((sum, subject) => sum + subject.questions.length, 0);
    els.homeStats.innerHTML = `
      <span>学科 ${subjectCount}</span>
      <span>总题量 ${total}</span>
      <span>当前 ${data.meta.subject}</span>
    `;
  }
}

function initTopics() {
  els.topicFilter.innerHTML = '<option value="all">全部考点</option>';
  const topics = [...new Set(questions.flatMap((q) => q.knowledge || []))].filter(Boolean);
  for (const topic of topics) {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    els.topicFilter.append(option);
  }
}

function selectSubject(subjectId) {
  if (!subjects[subjectId]) return;
  activeSubjectId = subjectId;
  data = subjects[activeSubjectId];
  localQuestions = readLocalQuestions();
  practiceState = readPracticeState();
  questions = [...data.questions, ...normalizeImported(localQuestions)];
  filtered = [...questions];
  currentIndex = 0;
  selected = [];
  checked = false;
  wrongOnly = false;
  retryingQuestions.clear();
  els.courseEyebrow.textContent = data.meta.subject;
  els.courseTitle.textContent = `${data.meta.subject}期末复习题库`;
  renderStats();
  renderPracticeSummary();
  initTopics();
  renderTopics();
  renderSources();
  renderMine();
  applyFilters();
}

function applyFilters() {
  const sourceValue = els.sourceFilter.value;
  const topicValue = els.topicFilter.value;
  const keyword = els.searchInput.value.trim().toLowerCase();

  filtered = questions.filter((q) => {
    const sourceOk =
      sourceValue === "all" ||
      (sourceValue === "todo" ? !q.answer : q.source === sourceValue);
    const topicOk = topicValue === "all" || (q.knowledge || []).includes(topicValue);
    const wrongOk = !wrongOnly || Boolean(practiceState.wrongArchive[q.id]);
    const visibleOk = !practiceState.chopped[q.id];
    const imageText = q.image ? `${q.image.alt || ""} ${q.image.caption || ""} ${q.image.credit || ""}` : "";
    const haystack = `${q.stem} ${Object.values(q.options).join(" ")} ${imageText}`.toLowerCase();
    const keywordOk = !keyword || haystack.includes(keyword);
    return sourceOk && topicOk && wrongOk && visibleOk && keywordOk;
  });

  currentIndex = Math.min(currentIndex, Math.max(filtered.length - 1, 0));
  selected = [];
  checked = false;
  renderPracticeSummary();
  renderQuestion();
  renderQueue();
}

function currentQuestion() {
  return filtered[currentIndex];
}

function renderExplanation(q, verdict) {
  const answer = q.answer || "";
  const imageCredit = q.image?.page
    ? `<br><small>显微图：<a href="${q.image.page}" target="_blank" rel="noreferrer">${escapeHtml(q.image.credit || q.image.page)}</a></small>`
    : "";
  els.explanation.hidden = false;
  els.explanation.innerHTML = `<strong>${verdict}：${optionAnswer(answer, q) || "未提供"}</strong><br>${q.explanation || ""}<br><small>来源：${q.sourceFile || "资料库"}</small>${imageCredit}`;
}

function renderFillInput(q, record) {
  const value = selected[0] || "";
  const wrapper = document.createElement("label");
  wrapper.className = "fill-answer";
  if (checked) {
    wrapper.classList.add(record?.lastCorrect ? "correct" : "wrong");
  }
  wrapper.innerHTML = `
    <span>填写病理诊断</span>
    <input id="fill-answer-input" type="text" autocomplete="off" spellcheck="false" placeholder="例如：肝硬化" value="${escapeHtml(value)}" ${checked ? "disabled" : ""} />
  `;
  els.options.append(wrapper);
  const input = wrapper.querySelector("input");
  input?.addEventListener("input", () => {
    selected = [input.value];
  });
}

function updateQuestionTools(q) {
  const disabled = !q;
  [els.statsBtn, els.favoriteBtn, els.annotationBtn, els.chopBtn].forEach((button) => {
    if (button) button.disabled = disabled;
  });
  if (!q) return;
  const isFavorite = Boolean(practiceState.favorites[q.id]);
  const hasAnnotation = Boolean(practiceState.annotations[q.id]?.text);
  setToolState(
    els.favoriteBtn,
    isFavorite,
    "./public/icons/bookmark-check.svg",
    "./public/icons/bookmark.svg",
  );
  setToolState(els.annotationBtn, hasAnnotation);
  els.favoriteBtn.setAttribute("aria-label", isFavorite ? "取消收藏当前题目" : "收藏当前题目");
  els.favoriteBtn.dataset.tooltip = isFavorite ? "已收藏" : "收藏";
  els.annotationBtn.dataset.tooltip = hasAnnotation ? "查看批注" : "批注";
}

function renderQuestion() {
  const q = currentQuestion();
  els.options.innerHTML = "";
  els.explanation.hidden = true;
  els.explanation.textContent = "";
  if (els.media) {
    els.media.hidden = true;
    els.media.innerHTML = "";
  }

  if (!q) {
    updateQuestionTools(null);
    els.sourceBadge.textContent = "无题目";
    els.topicBadge.textContent = "";
    els.progressBadge.textContent = "";
    els.stem.textContent = "没有匹配的题目";
    els.checkBtn.disabled = true;
    return;
  }

  updateQuestionTools(q);
  const record = retryingQuestions.has(q.id) ? null : practiceState.attempts[q.id];
  selected = record?.lastSelected ? (isFillQuestion(q) ? [record.lastSelected] : normalizeSelection(record.lastSelected)) : [];
  checked = Boolean(record?.lastSelected && q.answer);
  els.checkBtn.disabled = false;
  els.sourceBadge.textContent = q.source;
  els.topicBadge.textContent = (q.knowledge || ["未分类"])[0];
  els.progressBadge.textContent = `${currentIndex + 1} / ${filtered.length}`;
  els.stem.textContent = q.stem;
  els.stem.classList.toggle("has-annotation", Boolean(practiceState.annotations[q.id]?.text));
  els.checkBtn.textContent = checked ? "重做此题" : q.answer ? (isFillQuestion(q) ? "提交填空" : isMultipleQuestion(q) ? "提交多选" : "提交") : "待核验";

  if (els.media && q.image?.src) {
    const href = q.image.page || q.image.src;
    const alt = escapeHtml(q.image.alt || q.stem);
    const caption = q.image.caption ? `<small>${escapeHtml(q.image.caption)}</small>` : "";
    els.media.hidden = false;
    els.media.innerHTML = `
      <a href="${href}" target="_blank" rel="noreferrer">
        <img src="${q.image.src}" alt="${alt}" loading="lazy" />
      </a>
      ${caption}
    `;
  }

  if (isFillQuestion(q)) {
    renderFillInput(q, record);
    if (checked) {
      renderExplanation(q, record.lastCorrect ? "上次答对" : "上次答错");
    }
    return;
  }

  Object.entries(q.options).forEach(([key, value]) => {
    const button = document.createElement("button");
    button.className = "option";
    button.dataset.key = key;
    button.innerHTML = `<b>${key}</b><span>${value}</span>`;
    button.classList.toggle("selected", normalizeSelection(selected).includes(key));
    if (checked) {
      const isCorrect = q.answer.includes(key);
      button.classList.toggle("correct", isCorrect);
      button.classList.toggle("wrong", Boolean(normalizeSelection(selected).includes(key) && !isCorrect));
    }
    button.addEventListener("click", () => chooseOption(key));
    els.options.append(button);
  });

  if (checked) {
    renderExplanation(q, record.lastCorrect ? "上次答对" : "上次答错");
  }
}

function chooseOption(key) {
  if (checked) return;
  const q = currentQuestion();
  if (isMultipleQuestion(q)) {
    const next = new Set(normalizeSelection(selected));
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    selected = [...next].sort();
  } else {
    selected = [key];
  }
  document.querySelectorAll(".option").forEach((option) => {
    option.classList.toggle("selected", normalizeSelection(selected).includes(option.dataset.key));
  });
}

function checkAnswer() {
  const q = currentQuestion();
  if (!q) return;
  if (checked) {
    retryingQuestions.add(q.id);
    renderQuestion();
    return;
  }
  checked = true;
  const answer = q.answer || "";
  if (isFillQuestion(q)) {
    const input = document.querySelector("#fill-answer-input");
    const choice = (input?.value || selected[0] || "").trim();
    selected = [choice];
    const isSelectedCorrect = isFillAnswerCorrect(q, choice);
    const wrapper = document.querySelector(".fill-answer");
    wrapper?.classList.toggle("correct", Boolean(choice && isSelectedCorrect));
    wrapper?.classList.toggle("wrong", Boolean(choice && !isSelectedCorrect));
    if (input) input.disabled = true;
    const verdict = answer
      ? choice
        ? isSelectedCorrect
          ? "答对了"
          : "再看一眼"
        : "参考答案"
      : "待核验";
    if (choice && answer) {
      retryingQuestions.delete(q.id);
      recordAttempt(q, choice, isSelectedCorrect);
      renderStats();
      renderPracticeSummary();
      renderQueue();
    }
    els.checkBtn.textContent = "重做此题";
    renderExplanation(q, verdict);
    return;
  }

  const choice = selectionValue();
  const isSelectedCorrect = Boolean(choice && answerKeys(answer).join("") === choice);

  document.querySelectorAll(".option").forEach((option) => {
    const key = option.dataset.key;
    const isCorrect = answer.includes(key);
    option.classList.toggle("correct", isCorrect);
    option.classList.toggle("wrong", Boolean(normalizeSelection(selected).includes(key) && !isCorrect));
  });

  const verdict = answer
    ? choice
      ? isSelectedCorrect
        ? "答对了"
        : "再看一眼"
      : "参考答案"
    : "待核验";
  if (choice && answer) {
    retryingQuestions.delete(q.id);
    recordAttempt(q, choice, isSelectedCorrect);
    renderStats();
    renderPracticeSummary();
    renderQueue();
  }
  els.checkBtn.textContent = "重做此题";
  renderExplanation(q, verdict);
}

function move(delta) {
  if (!filtered.length) return;
  currentIndex = (currentIndex + delta + filtered.length) % filtered.length;
  renderQuestion();
  renderQueue();
}

function shuffle() {
  if (!filtered.length) return;
  currentIndex = Math.floor(Math.random() * filtered.length);
  renderQuestion();
  renderQueue();
}

function renderQueue() {
  els.queueCount.textContent = `${filtered.length}`;
  els.questionList.innerHTML = "";
  filtered.forEach((q, index) => {
    const chip = document.createElement("button");
    const record = practiceState.attempts[q.id];
    const archivedWrong = practiceState.wrongArchive[q.id];
    const hasAnnotation = Boolean(practiceState.annotations[q.id]?.text);
    const isFavorite = Boolean(practiceState.favorites[q.id]);
    chip.className = [
      "question-chip",
      index === currentIndex ? "active" : "",
      record ? "done" : "",
      record?.lastCorrect ? "last-correct" : "",
      archivedWrong ? "archived-wrong" : "",
      hasAnnotation ? "annotated" : "",
      isFavorite ? "favorited" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const status = archivedWrong ? "错题" : record ? "已做" : "";
    const markers = `${isFavorite ? '<img src="./public/icons/bookmark.svg" alt="" title="已收藏" />' : ""}${hasAnnotation ? '<img src="./public/icons/notebook-pen.svg" alt="" title="有批注" />' : ""}`;
    chip.innerHTML = `<small>${q.id}${status ? ` · ${status}` : ""}</small><span>${q.stem}</span><i>${markers}</i>`;
    chip.addEventListener("click", () => {
      currentIndex = index;
      renderQuestion();
      renderQueue();
    });
    els.questionList.append(chip);
  });
}

function toggleFavorite() {
  const q = currentQuestion();
  if (!q) return;
  if (practiceState.favorites[q.id]) {
    delete practiceState.favorites[q.id];
  } else {
    practiceState.favorites[q.id] = { at: new Date().toISOString() };
  }
  savePracticeState();
  updateQuestionTools(q);
  renderQueue();
  renderMine();
}

function chopCurrentQuestion() {
  const q = currentQuestion();
  if (!q) return;
  practiceState.chopped[q.id] = {
    at: new Date().toISOString(),
    topic: (q.knowledge || [])[0] || "未分类",
  };
  savePracticeState();
  retryingQuestions.delete(q.id);
  applyFilters();
  renderMine();
  openDialog(els.chopDialog);
}

function openAnnotationDialog() {
  const q = currentQuestion();
  if (!q) return;
  const annotation = practiceState.annotations[q.id];
  els.annotationQuestion.textContent = q.stem;
  els.annotationInput.value = annotation?.text || "";
  els.annotationDeleteBtn.hidden = !annotation?.text;
  openDialog(els.annotationDialog);
  window.setTimeout(() => els.annotationInput.focus(), 0);
}

function saveAnnotation() {
  const q = currentQuestion();
  if (!q) return;
  const text = els.annotationInput.value.trim();
  if (text) {
    practiceState.annotations[q.id] = {
      text,
      updatedAt: new Date().toISOString(),
    };
  } else {
    delete practiceState.annotations[q.id];
  }
  savePracticeState();
  closeDialog(els.annotationDialog);
  updateQuestionTools(q);
  renderQueue();
  renderMine();
}

function deleteAnnotation() {
  const q = currentQuestion();
  if (!q) return;
  delete practiceState.annotations[q.id];
  savePracticeState();
  closeDialog(els.annotationDialog);
  updateQuestionTools(q);
  renderQueue();
  renderMine();
}

function currentChapter() {
  const selectedTopic = els.topicFilter.value;
  if (selectedTopic && selectedTopic !== "all") return selectedTopic;
  return (currentQuestion()?.knowledge || [])[0] || "未分类";
}

function scopedStats(scope = activeStatsScope) {
  const chapter = currentChapter();
  const pool = scope === "chapter"
    ? questions.filter((q) => (q.knowledge || []).includes(chapter))
    : questions;
  const answeredRecords = pool
    .map((q) => practiceState.attempts[q.id])
    .filter(Boolean);
  const correct = answeredRecords.filter((record) => record.lastCorrect).length;
  const wrong = answeredRecords.length - correct;
  return {
    total: pool.length,
    answered: answeredRecords.length,
    correct,
    wrong,
    unanswered: Math.max(pool.length - answeredRecords.length, 0),
    label: scope === "chapter" ? chapter : data.meta.subject,
  };
}

function renderStatsDialog(scope = activeStatsScope) {
  activeStatsScope = scope;
  document.querySelectorAll("[data-stats-scope]").forEach((button) => {
    button.classList.toggle("active", button.dataset.statsScope === scope);
  });
  const values = scopedStats(scope);
  const pct = (value) => values.total ? Math.round((value / values.total) * 100) : 0;
  els.statsContext.textContent = `${scope === "chapter" ? "当前章节" : "当前学科"} · ${values.label}`;
  els.statsGrid.innerHTML = `
    <div class="stat-metric total"><span>题量</span><strong>${values.total}</strong></div>
    <div class="stat-metric answered"><span>答题数</span><strong>${values.answered}</strong></div>
    <div class="stat-metric correct"><span>对</span><strong>${values.correct}</strong></div>
    <div class="stat-metric wrong"><span>错</span><strong>${values.wrong}</strong></div>
  `;
  els.statsChart.innerHTML = `
    <div class="chart-stack" aria-label="答题结果分布">
      <span class="chart-correct" style="width:${pct(values.correct)}%"></span>
      <span class="chart-wrong" style="width:${pct(values.wrong)}%"></span>
      <span class="chart-unanswered" style="width:${pct(values.unanswered)}%"></span>
    </div>
    <div class="chart-legend">
      <span><i class="correct-dot"></i>答对 ${pct(values.correct)}%</span>
      <span><i class="wrong-dot"></i>答错 ${pct(values.wrong)}%</span>
      <span><i class="unanswered-dot"></i>未作答 ${pct(values.unanswered)}%</span>
    </div>
    <div class="bar-chart">
      <div><label>答对</label><b><i class="correct-bar" style="width:${pct(values.correct)}%"></i></b><span>${values.correct}</span></div>
      <div><label>答错</label><b><i class="wrong-bar" style="width:${pct(values.wrong)}%"></i></b><span>${values.wrong}</span></div>
      <div><label>未作答</label><b><i class="unanswered-bar" style="width:${pct(values.unanswered)}%"></i></b><span>${values.unanswered}</span></div>
    </div>
  `;
}

function openStatsDialog() {
  activeStatsScope = "subject";
  renderStatsDialog(activeStatsScope);
  openDialog(els.statsDialog);
}

function savedItems(type) {
  return Object.entries(subjects).flatMap(([subjectId, subject]) => {
    const state = readPracticeState(subjectId);
    const collection = type === "chopped" ? state.chopped : state.favorites;
    return Object.entries(collection).map(([questionId, saved]) => {
      const question = questionById(subjectId, questionId);
      if (!question) return null;
      return { subjectId, subject, state, question, saved };
    });
  }).filter(Boolean).sort((a, b) => String(b.saved.at || "").localeCompare(String(a.saved.at || "")));
}

function restoreChoppedQuestion(subjectId, questionId) {
  const state = readPracticeState(subjectId);
  delete state.chopped[questionId];
  savePracticeState(state, subjectId);
  if (subjectId === activeSubjectId) {
    practiceState = state;
    applyFilters();
  }
  renderMine();
}

function removeFavorite(subjectId, questionId) {
  const state = readPracticeState(subjectId);
  delete state.favorites[questionId];
  savePracticeState(state, subjectId);
  if (subjectId === activeSubjectId) {
    practiceState = state;
    updateQuestionTools(currentQuestion());
    renderQueue();
  }
  renderMine();
}

function openSavedQuestion(subjectId, questionId) {
  selectSubject(subjectId);
  els.sourceFilter.value = "all";
  els.topicFilter.value = "all";
  els.searchInput.value = "";
  wrongOnly = false;
  applyFilters();
  const index = filtered.findIndex((q) => q.id === questionId);
  if (index >= 0) currentIndex = index;
  showView("practice");
  renderQuestion();
  renderQueue();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderMine() {
  if (!els.mineList) return;
  const favorites = savedItems("favorites");
  const chopped = savedItems("chopped");
  els.favoriteCount.textContent = favorites.length;
  els.choppedCount.textContent = chopped.length;
  document.querySelectorAll("[data-mine-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mineTab === activeMineTab);
  });
  const items = activeMineTab === "favorites" ? favorites : chopped;
  if (!items.length) {
    els.mineList.innerHTML = `
      <div class="mine-empty">
        <img src="./public/icons/${activeMineTab === "favorites" ? "bookmark" : "scissors"}.svg" alt="" aria-hidden="true" />
        <h2>${activeMineTab === "favorites" ? "收藏夹还是空的" : "还没有已斩试题"}</h2>
        <p>${activeMineTab === "favorites" ? "刷题时点击收藏图标，重要题目就会出现在这里。" : "斩掉的题会从练习序列中隐藏，并集中保存在这里。"}</p>
      </div>
    `;
    return;
  }
  els.mineList.innerHTML = "";
  items.forEach(({ subjectId, subject, state, question }) => {
    const note = state.annotations[question.id]?.text;
    const isChopped = Boolean(state.chopped[question.id]);
    const card = document.createElement("article");
    card.className = "saved-question-card";
    card.innerHTML = `
      <div class="saved-question-meta">
        <span>${escapeHtml(subject.meta.subject)}</span>
        <span>${escapeHtml((question.knowledge || ["未分类"])[0])}</span>
        ${isChopped ? "<span class=\"chopped-label\">已斩</span>" : ""}
      </div>
      <h3>${escapeHtml(question.stem)}</h3>
      ${note ? `<p class="saved-note"><img src="./public/icons/notebook-pen.svg" alt="" aria-hidden="true" />${escapeHtml(note)}</p>` : ""}
      <div class="saved-card-actions"></div>
    `;
    const actions = card.querySelector(".saved-card-actions");
    if (activeMineTab === "favorites" && !isChopped) {
      const openButton = document.createElement("button");
      openButton.className = "primary compact-action";
      openButton.textContent = "打开此题";
      openButton.addEventListener("click", () => openSavedQuestion(subjectId, question.id));
      actions.append(openButton);
    }
    const actionButton = document.createElement("button");
    actionButton.className = "icon-label-action";
    if (activeMineTab === "chopped") {
      actionButton.innerHTML = '<img src="./public/icons/undo-2.svg" alt="" aria-hidden="true" />恢复到题库';
      actionButton.addEventListener("click", () => restoreChoppedQuestion(subjectId, question.id));
    } else {
      actionButton.innerHTML = '<img src="./public/icons/trash-2.svg" alt="" aria-hidden="true" />取消收藏';
      actionButton.addEventListener("click", () => removeFavorite(subjectId, question.id));
    }
    actions.append(actionButton);
    els.mineList.append(card);
  });
}

function renderTopics() {
  els.topicGrid.innerHTML = "";
  data.topics.forEach((topic) => {
    const count = questions.filter((q) => (q.knowledge || []).includes(topic.name)).length;
    const card = document.createElement("article");
    card.className = "review-card";
    card.innerHTML = `
      <h2>${topic.name}</h2>
      <p>${topic.note}</p>
      <button class="ghost" data-topic="${topic.name}">刷 ${count} 题</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      showView("practice");
      els.topicFilter.value = topic.name;
      applyFilters();
    });
    els.topicGrid.append(card);
  });
}

function renderSources() {
  const skipped = data.meta.skippedLegacyPpt || [];
  const resources = data.resources || [];
  const resourceMarkup = resources.length
    ? `
    <div class="resource-grid">
      ${resources
        .map(
          (resource) => `
        <a class="resource-card" href="${resource.src}" target="_blank" rel="noreferrer">
          <img src="${resource.src}" alt="${resource.title}" loading="lazy" />
          <span>${resource.type || "资料"}</span>
          <strong>${resource.title}</strong>
        </a>
      `
        )
        .join("")}
    </div>
  `
    : "";
  els.sourceLog.innerHTML = `
    <div class="source-row"><strong>题库</strong><small>原题 ${data.meta.originalCount}；新编 ${data.meta.extendedCount}；待核验 ${data.meta.missingAnswerCount}</small></div>
    <div class="source-row"><strong>当前学科</strong><small>${data.meta.subject}；${data.meta.source || data.meta.latestAudit?.source || "资料库已同步"}</small></div>
    <div class="source-row"><strong>待转换课件</strong><small>${skipped.join("；") || "无"}</small></div>
    <div class="source-row"><strong>扩展接口</strong><small>支持 JSON 导入并写入 localStorage；后续可替换为 /api/subjects/:id/questions</small></div>
    ${resourceMarkup}
  `;
}

function showView(view) {
  const isHome = view === "home";
  document.body.classList.toggle("is-home", isHome);
  document.body.classList.toggle("is-course", !isHome);
  document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
  document.querySelector(`#${view}-view`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((button) => {
    const navView = isHome ? "home" : view === "mine" ? "mine" : "practice";
    const active = button.dataset.view === navView;
    button.classList.toggle("active", active);
  });
  document.querySelectorAll(".course-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (view === "mine") renderMine();
}

function transitionToSubject(subjectId, view = "practice") {
  const subject = subjects[subjectId];
  if (!subject) {
    showView(view);
    return;
  }
  if (!els.routeTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    selectSubject(subjectId);
    showView(view);
    window.scrollTo(0, 0);
    return;
  }
  els.routeTransitionTitle.textContent = `进入 ${subject.meta.subject}`;
  els.routeTransition.classList.remove("leaving");
  els.routeTransition.classList.add("active");
  window.setTimeout(() => {
    selectSubject(subjectId);
    showView(view);
    window.scrollTo(0, 0);
    els.routeTransition.classList.add("leaving");
  }, 220);
  window.setTimeout(() => {
    els.routeTransition.classList.remove("active", "leaving");
  }, 700);
}

function importQuestions() {
  try {
    const parsed = JSON.parse(els.importJson.value || "[]");
    if (!Array.isArray(parsed)) throw new Error("JSON root must be an array");
    localQuestions = [...localQuestions, ...parsed];
    localStorage.setItem(`pete-extra-questions-${activeSubjectId}`, JSON.stringify(localQuestions));
    questions = [...data.questions, ...normalizeImported(localQuestions)];
    filtered = [...questions];
    renderStats();
    renderPracticeSummary();
    renderTopics();
    renderSources();
    renderMine();
    applyFilters();
    els.importJson.value = "";
  } catch (error) {
    els.importJson.value = `JSON 格式有误：${error.message}`;
  }
}

function resetLocal() {
  localStorage.removeItem(`pete-extra-questions-${activeSubjectId}`);
  localQuestions = [];
  questions = [...data.questions];
  filtered = [...questions];
  renderStats();
  renderPracticeSummary();
  renderTopics();
  renderSources();
  renderMine();
  applyFilters();
}

function resetPracticeState() {
  els.resetMessage.textContent = `将清空 ${data.meta.subject} 的练习记录、正确率、错题本和已斩状态；收藏与批注会保留。`;
  openDialog(els.resetDialog);
}

function confirmResetPracticeState() {
  practiceState = {
    ...emptyPracticeState(),
    favorites: practiceState.favorites,
    annotations: practiceState.annotations,
  };
  savePracticeState();
  wrongOnly = false;
  retryingQuestions.clear();
  selected = [];
  checked = false;
  renderStats();
  renderPracticeSummary();
  renderMine();
  applyFilters();
  closeDialog(els.resetDialog);
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.subject) {
      transitionToSubject(button.dataset.subject, button.dataset.view);
      return;
    }
    showView(button.dataset.view);
    if (button.dataset.view === "home") window.scrollTo(0, 0);
  });
});

els.sourceFilter.addEventListener("change", applyFilters);
els.topicFilter.addEventListener("change", applyFilters);
els.searchInput.addEventListener("input", applyFilters);
els.shuffleBtn.addEventListener("click", shuffle);
els.checkBtn.addEventListener("click", checkAnswer);
els.prevBtn.addEventListener("click", () => move(-1));
els.nextBtn.addEventListener("click", () => move(1));
els.importBtn.addEventListener("click", importQuestions);
els.resetLocalBtn.addEventListener("click", resetLocal);
els.favoriteBtn.addEventListener("click", toggleFavorite);
els.annotationBtn.addEventListener("click", openAnnotationDialog);
els.chopBtn.addEventListener("click", chopCurrentQuestion);
els.statsBtn.addEventListener("click", openStatsDialog);
els.annotationSaveBtn.addEventListener("click", saveAnnotation);
els.annotationDeleteBtn.addEventListener("click", deleteAnnotation);
els.statsCloseBtn.addEventListener("click", () => closeDialog(els.statsDialog));
els.chopDialogClose.addEventListener("click", () => closeDialog(els.chopDialog));
els.resetDialogCancel.addEventListener("click", () => closeDialog(els.resetDialog));
els.resetDialogConfirm.addEventListener("click", confirmResetPracticeState);

document.querySelectorAll("[data-mine-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    activeMineTab = button.dataset.mineTab;
    renderMine();
  });
});

document.querySelectorAll("[data-stats-scope]").forEach((button) => {
  button.addEventListener("click", () => renderStatsDialog(button.dataset.statsScope));
});

[els.annotationDialog, els.statsDialog, els.chopDialog, els.resetDialog].forEach((dialog) => {
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

renderStats();
selectSubject(activeSubjectId);
showView("home");
