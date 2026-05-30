const data = window.PETE_QUESTIONS;
let localQuestions = JSON.parse(localStorage.getItem("pete-extra-questions") || "[]");
let questions = [...data.questions, ...normalizeImported(localQuestions)];
let filtered = [...questions];
let currentIndex = 0;
let selected = "";
let checked = false;

const els = {
  stats: document.querySelector("#stats"),
  sourceFilter: document.querySelector("#source-filter"),
  topicFilter: document.querySelector("#topic-filter"),
  searchInput: document.querySelector("#search-input"),
  shuffleBtn: document.querySelector("#shuffle-btn"),
  sourceBadge: document.querySelector("#source-badge"),
  topicBadge: document.querySelector("#topic-badge"),
  progressBadge: document.querySelector("#progress-badge"),
  stem: document.querySelector("#question-stem"),
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
};

function normalizeImported(items) {
  return items
    .filter((item) => item && item.stem && item.options)
    .map((item, index) => ({
      id: item.id || `local-${index + 1}`,
      source: item.source || "新编拓展题（AI深度改编）",
      sourceFile: item.sourceFile || "本地导入",
      number: item.number || index + 1,
      type: "single",
      stem: item.stem,
      options: item.options,
      answer: (item.answer || "").toUpperCase(),
      explanation: item.explanation || "本地导入题，解析待补充。",
      knowledge: item.knowledge || ["本地扩展"],
    }));
}

function optionAnswer(answer) {
  if (!answer) return "";
  return answer.length > 1 ? answer.split("").join(" / ") : answer;
}

function renderStats() {
  const original = questions.filter((q) => q.source.includes("原题")).length;
  const ai = questions.filter((q) => q.source.includes("新编")).length;
  const todo = questions.filter((q) => !q.answer).length;
  els.stats.innerHTML = `
    <span>原题 ${original}</span>
    <span>新编 ${ai}</span>
    <span>待核验 ${todo}</span>
  `;
}

function initTopics() {
  const topics = [...new Set(questions.flatMap((q) => q.knowledge || []))].filter(Boolean);
  for (const topic of topics) {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    els.topicFilter.append(option);
  }
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
    const haystack = `${q.stem} ${Object.values(q.options).join(" ")}`.toLowerCase();
    const keywordOk = !keyword || haystack.includes(keyword);
    return sourceOk && topicOk && keywordOk;
  });

  currentIndex = Math.min(currentIndex, Math.max(filtered.length - 1, 0));
  selected = "";
  checked = false;
  renderQuestion();
  renderQueue();
}

function currentQuestion() {
  return filtered[currentIndex];
}

function renderQuestion() {
  const q = currentQuestion();
  els.options.innerHTML = "";
  els.explanation.hidden = true;
  els.explanation.textContent = "";
  selected = "";
  checked = false;

  if (!q) {
    els.sourceBadge.textContent = "无题目";
    els.topicBadge.textContent = "";
    els.progressBadge.textContent = "";
    els.stem.textContent = "没有匹配的题目";
    els.checkBtn.disabled = true;
    return;
  }

  els.checkBtn.disabled = false;
  els.sourceBadge.textContent = q.source;
  els.topicBadge.textContent = (q.knowledge || ["未分类"])[0];
  els.progressBadge.textContent = `${currentIndex + 1} / ${filtered.length}`;
  els.stem.textContent = q.stem;
  els.checkBtn.textContent = q.answer ? "提交" : "待核验";

  Object.entries(q.options).forEach(([key, value]) => {
    const button = document.createElement("button");
    button.className = "option";
    button.dataset.key = key;
    button.innerHTML = `<b>${key}</b><span>${value}</span>`;
    button.addEventListener("click", () => chooseOption(key));
    els.options.append(button);
  });
}

function chooseOption(key) {
  if (checked) return;
  selected = key;
  document.querySelectorAll(".option").forEach((option) => {
    option.classList.toggle("selected", option.dataset.key === key);
  });
}

function checkAnswer() {
  const q = currentQuestion();
  if (!q) return;
  checked = true;
  const answer = q.answer || "";

  document.querySelectorAll(".option").forEach((option) => {
    const key = option.dataset.key;
    const isCorrect = answer.includes(key);
    option.classList.toggle("correct", isCorrect);
    option.classList.toggle("wrong", Boolean(selected && key === selected && !isCorrect));
  });

  const verdict = answer
    ? selected
      ? answer.includes(selected)
        ? "答对了"
        : "再看一眼"
      : "参考答案"
    : "待核验";
  els.explanation.hidden = false;
  els.explanation.innerHTML = `<strong>${verdict}：${optionAnswer(answer) || "未提供"}</strong><br>${q.explanation || ""}<br><small>来源：${q.sourceFile || "资料库"}</small>`;
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
    chip.className = `question-chip ${index === currentIndex ? "active" : ""}`;
    chip.innerHTML = `<small>${q.id}</small><span>${q.stem}</span>`;
    chip.addEventListener("click", () => {
      currentIndex = index;
      renderQuestion();
      renderQueue();
    });
    els.questionList.append(chip);
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
  els.sourceLog.innerHTML = `
    <div class="source-row"><strong>题库</strong><small>原题 ${data.meta.originalCount}；新编 ${data.meta.extendedCount}；待核验 ${data.meta.missingAnswerCount}</small></div>
    <div class="source-row"><strong>正确题源</strong><small>医学心理学试题(1)(1).docx 已作为主来源</small></div>
    <div class="source-row"><strong>待转换课件</strong><small>${skipped.join("；") || "无"}</small></div>
    <div class="source-row"><strong>扩展接口</strong><small>支持 JSON 导入并写入 localStorage；后续可替换为 /api/subjects/:id/questions</small></div>
  `;
}

function showView(view) {
  document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
  document.querySelector(`#${view}-view`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function importQuestions() {
  try {
    const parsed = JSON.parse(els.importJson.value || "[]");
    if (!Array.isArray(parsed)) throw new Error("JSON root must be an array");
    localQuestions = [...localQuestions, ...parsed];
    localStorage.setItem("pete-extra-questions", JSON.stringify(localQuestions));
    questions = [...data.questions, ...normalizeImported(localQuestions)];
    filtered = [...questions];
    renderStats();
    renderTopics();
    renderSources();
    applyFilters();
    els.importJson.value = "";
  } catch (error) {
    els.importJson.value = `JSON 格式有误：${error.message}`;
  }
}

function resetLocal() {
  localStorage.removeItem("pete-extra-questions");
  localQuestions = [];
  questions = [...data.questions];
  filtered = [...questions];
  renderStats();
  renderTopics();
  renderSources();
  applyFilters();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
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

renderStats();
initTopics();
renderTopics();
renderSources();
applyFilters();
