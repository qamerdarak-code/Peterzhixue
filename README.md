# 皮特智学

面向扬州大学医学部学生的多学科期末复习网站。当前版本包含本地学习记录、错题与收藏管理，以及由服务端安全调用 DeepSeek 的 AI 题目解析。

## 本地运行

需要 Node.js 18 或更高版本：

```powershell
Copy-Item .env.example .env.local
npm run dev
```

打开 `http://127.0.0.1:4173`。开发服务器会读取 `.env.local`；该文件已被 Git 忽略。

## AI 解析配置

前端仅提交题目 ID，题干、选项和标准答案由服务端从 `public/questions.js` 读取。`DEEPSEEK_API_KEY` 只能配置在服务端环境变量中，禁止写入网页、仓库或提交记录。

生产环境建议配置：

- `DEEPSEEK_API_KEY`：DeepSeek 服务端密钥。
- `DEEPSEEK_MODEL`：默认 `deepseek-v4-flash`。
- `KV_REST_API_URL`、`KV_REST_API_TOKEN`：Upstash Redis REST，用于持久缓存、限流和反馈统计。

完整变量见 `.env.example`。

## 部署

GitHub Pages 只能托管静态网页，不能执行 `/api/ai/*`。AI 解析应部署到已连接本仓库的 Vercel 项目：

1. Vercel Project Settings 使用仓库根目录作为 Root Directory。
2. Framework Preset 设为 `Other`，Build Command 保持空白，Output Directory 不启用 Override（不要强制设置为 `.`）。
3. 在 Vercel 项目设置中添加上述服务端环境变量。
4. 重新部署 `main` 分支。
5. 在 Vercel Domains 中绑定 `peterzhixue.tech`，并按 Vercel 提示修改 DNS；该域名必须同时提供静态页面和 `/api/*` 函数，不能再仅指向 GitHub Pages。
6. 在 Vercel Functions 日志中确认 `/api/health` 与 `/api/ai/explain` 返回正常结果。

若未配置 AI 服务，刷题功能仍可使用，AI 面板会显示可重试的配置提示。

## 接口

- `POST /api/ai/explain`：请求 AI 解析，请求体至少包含 `questionId`。
- `POST /api/ai/explanation-feedback`：提交点赞、点踩或举报，不触发新的模型调用。
- `GET /api/health`：检查函数区域与 DeepSeek 是否完成服务端配置，不返回密钥内容。

具体结构见 `src/api-contract.json`。

## 验证

```powershell
npm run check
```

测试覆盖服务端题目查询、结构化结果校验、缓存、限流、超时、反馈和异常保护。
