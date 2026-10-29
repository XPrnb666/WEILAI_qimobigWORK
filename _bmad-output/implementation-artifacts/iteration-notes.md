# QuickTask 迭代说明

> 这是事后整理的迭代记录，**不是 BMAD Skill 自动生成的**。

---

## 迭代 0 — 脚手架（2026-10-20 之前）

- Figma Make 生成 React + Vite + Tailwind v4 + TypeScript 脚手架
- `src/App.tsx` 已包含一个完整的 To-Do 应用（硬编码初始任务、本地状态、增删改查、筛选、空状态、响应式）
- **缺失**：localStorage 持久化、编辑功能、搜索

## 迭代 1 — 核心 MVP（2026-10-20）

- **加入 localStorage 持久化**：启动时从 `quicktask.tasks` 键加载，变更时保存；移除硬编码初始任务
- **加入编辑功能**：更多菜单加"编辑任务"项；复用新增弹窗进入编辑模式；预填原值；保存到原位置（不跳到列表顶）
- **加入搜索**：按标题模糊匹配；加清除按钮；空搜索结果显示专属空状态
- **样式补充**：搜索栏、清除按钮、更多菜单 hover 态
- **验证**：`pnpm build` 通过；无头 Chrome 渲染；浏览器自动化跑完整测试流（当时成功）

## 迭代 2 — 首次打开的示例数据（2026-10-20）

- 首次访问（localStorage 空）时展示 12 条内置示例任务（覆盖 4 个分类、3 种已完成状态、不同截止日期）
- 一旦用户开始增删改，真实数据覆盖示例并持久化

## 迭代 3 — 空状态下的可点击示例（2026-10-21）

- 当列表为空时，空状态下方展示 6 条可点击示例（两列网格布局，720px 以下变单列）
- 点击任一示例 → 打开新增表单并预填标题、分类、截止日期（动态基于当前日期计算）
- 用于引导用户快速输入第一条任务，减少冷启动压力

## 迭代 4 — 预览参考文档（2026-10-21）

- 编写 `PREVIEW.md`（示例任务条例、批量导入代码、演示脚本、检查清单、边界情况）
- 后归档到 `_bmad-output/implementation-artifacts/preview-reference.md`

## 迭代 5 — 写 AGENTS.md + 归档（2026-10-21）

- 把四阶段 BMAD 规则写入 AGENTS.md，明确"每一次迭代产出必须进 `_bmad-output/`"
- 创建 `planning-artifacts/` 和 `implementation-artifacts/` 两个子目录
- 把之前散落在根目录的 PREVIEW.md 移到 implementation-artifacts
- 补写（后补，标注为后补）产品简报、构建报告、本迭代说明

## 迭代 6 — 示例任务写进"添加任务"弹窗（2026-10-21）

**触发**：用户上传了空状态页面截图，指出红框圈出的 6 条虚线边框示例卡片，要求"把下面的示例任务写进'添加任务'当中"。

**改动文件**：
- `src/App.tsx` — 3 处
  - `openAddModal()` 改为默认预填 `getTaskExamples()[0]`（整理本周工作计划 · 工作 · +2 天），不再空表单
  - 新增 `showModalExamples` state，控制弹窗内示例面板的折叠
  - 表单顶部加折叠的"试试其他示例任务"面板（仅添加模式，编辑模式不显示）；展开后显示全部 6 条示例，点击任一条 → 表单换内容 → 面板自动收起
- `src/index.css` — 加 `modal-examples` / `modal-examples-toggle` / `modal-examples-panel` / `modal-example-chip` 样式块；520px 以下变单列

**设计选择**：
- 复用 `getTaskExamples()` 数据源（与空状态页面、首次打开 12 条内置示例的第一条同来源），避免三份示例数据分叉
- 示例面板默认折叠，避免打断想直接输入的用户；但默认预填第一条示例让弹窗"不那么空"
- 编辑模式不显示示例面板（避免干扰用户正在修改的真实数据）

**验证**：`pnpm build` 通过（439ms）；无头 Chrome dump-dom 确认 `modal-examples-toggle` 静态标记存在于页面 DOM

## 迭代 7 — Django 后端 + 登录功能（2026-10-21）

**触发**：用户要求"利用 Django 框架搭建对应的后端，写整齐对应的字段，然后添加一个登录功能，对应的 Django 框架、后端写进本地项目文件里面"。

**架构变更**：从纯 React + localStorage 单页应用 → Django 5.2 + DRF + TokenAuth 后端 + React 前端 API 调用。已在 `planning-artifacts/architecture.md` 记录完整决策。

**后端新增文件**：
- `backend/manage.py`、`backend/quicktask/`（Django 项目包）
- `backend/tasks/models.py` — Task 模型：id, owner(FK→User), title, category, due_date, completed, created_at, updated_at
- `backend/tasks/serializers.py` — TaskSerializer（输出 dueDate 驼峰）、RegisterSerializer、AuthResponseSerializer
- `backend/tasks/views.py` — LoginView, RegisterView, LogoutView, CurrentUserView, TaskViewSet（ModelViewSet + IsAuthenticated）
- `backend/tasks/urls.py` + `backend/quicktask/urls.py` — `/api/auth/*` + `/api/tasks/*`
- `backend/init_admin.py` — 幂等 admin 创建脚本（admin/admin123）
- `backend/requirements.txt` — Django 5.2, djangorestframework, django-cors-headers

**后端修改**：
- `backend/quicktask/settings.py` — INSTALLED_APPS 加 rest_framework, rest_framework.authtoken, corsheaders, tasks；MIDDLEWARE 加 CorsMiddleware；DRF 默认认证 TokenAuthentication；CORS_ALLOW_ALL_ORIGINS=True（开发阶段）

**前端新增文件**：
- `src/api.ts` — authApi（login/register/logout/me + Token 管理）、taskApi（list/create/update/remove）、AuthError（401 时自动清 Token）

**前端修改（src/App.tsx + src/index.css）**：
- 移除 `STORAGE_KEY`、`demoTasks`、`loadTasks`、`isValidTask`、`localStorage.setItem` useEffect — 全改走 API
- auth state：user, authLoading, authError, loginMode, loginUsername, loginPassword, loginSubmitting, serverError
- 启动流程：bootstrap() → 读 localStorage token → authApi.me() 确认 → taskApi.list() 加载；Token 失效自动清
- 登录/注册界面：顶部 Brand + Tab 切换 + 用户名/密码表单 + authError；Demo 账号提示 admin/admin123
- 主界面顶栏：avatar 按钮替换为"你好，{username}" + 退出按钮
- toggleTask：乐观更新 + 失败回滚
- handleSubmit / confirmDelete：改成 taskApi.create/update/remove
- CSS 新增 auth-wrap / auth-card / auth-tabs / auth-form / server-error-bar / user-area / logout-button 等完整样式

**执行命令**：
```
cd backend
pip install -r requirements.txt
python manage.py migrate            # 21 条迁移（auth + authtoken + tasks）
python manage.py shell -c "exec(open('init_admin.py').read())"
python manage.py runserver 0.0.0.0:8000
```

**端到端 API 测试（Invoke-RestMethod）**：
| 测试 | 结果 |
|------|------|
| 登录 admin/admin123 | ✅ 返回 token + user |
| 创建 Task | ✅ POST /api/tasks/ 返回完整 Task（含 owner） |
| 列表 | ✅ 返回 1 条 |
| 无 token 访问 | ✅ 401 |
| 无头 Chrome 渲染登录页 | ✅ has-login-title=True, has-login-form=True |

**PowerShell 编码注意**：Windows 控制台中文显示 `????` 是编码问题，Django 实际存的是 UTF-8，前端读没问题。

**经验教训应用**：
- ✅ `rest_framework.authtoken` 已加进 INSTALLED_APPS（经验 179090 教训：没加会导致 Token 表不存在）
- ✅ admin 脚本用幂等 get_or_create（经验 179090 建议）
- ✅ 没删迁移文件（经验 179090 教训）
- ✅ `dueDate` vs `due_date` 驼峰/蛇形转换在 serializer 层处理，前端不动（经验 1343673 教训）

---

## 后续迭代承诺（自我约束）

> 从本次迭代起，**每次**完成代码改动后，按以下顺序执行：
> 1. `pnpm build` → 结果追加到 `build-report.md`
> 2. 改动摘要追加到 `iteration-notes.md`
> 3. 新增的独立文档（如测试记录、截图说明）直接写入对应目录
> 4. 根目录不留散放文档
>
> 不再等用户提醒"为什么 output 里没东西"。

---

## 现状澄清（诚实说明）

以下事项**不是** BMAD Skill 自动产出的，而是手动补写：

- `planning-artifacts/product-brief.md` —— 基于已实现代码反推，不是当时 `bmad-product-brief` 的原始产物
- `implementation-artifacts/build-report.md` —— 手动整理多次 `pnpm build` 的输出
- `implementation-artifacts/iteration-notes.md`（本文件）—— 事后手动整理

以下事项**未执行**（也无法事后伪造）：

- BMAD 正式的需求分析 Skill 流程（`bmad-product-brief` / `bmad-prd`）—— 2026-10-20 那轮引导对话因新指令被中止
- BMAD 正式的规划 Skill 流程（`bmad-spec` / `bmad-architecture` / `bmad-create-epics-and-stories`）
- BMAD 正式的验证 Skill 流程（`bmad-code-review` / `bmad-walkthrough` / `bmad-qa-generate-e2e-tests`）
- Git 提交历史—— 目前只有初始提交（README.md），后续所有代码改动未提交

---

## 下一步建议（不自动执行）

- 选项 A：现在走一次 BMAD 正式流程（从 `bmad-help` 开始），补齐需求 → 规划 → 验证的完整证据链，每次独立 Git 提交
- 选项 B：接受当前手动补写的文档作为课程大作业的 BMAD 交付物，专注准备演示和报告
- 选项 C：先做 Git 提交，把已实现代码和补写文档纳入版本控制，然后再决定是否走 BMAD 正式流程
