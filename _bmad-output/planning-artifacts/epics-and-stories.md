# QuickTask 任务拆分（Epics & Stories）

> 生成日期：2026-10-21
> 状态：全部完成 ✅
> 关联产物：product-brief.md、architecture.md、spec.md

---

## Epic 总览

| Epic | 名称 | Stories | 对应 commit |
|------|------|---------|-------------|
| E1 | 认证与后端基建 | 3 | 32f1058 v0.2 → 7fe7a26 v1.0 |
| E2 | Task CRUD API | 3 | 7fe7a26 v1.0 |
| E3 | 前端对接 + 日历视图 | 3 | 320e03b v2.3 |
| E4 | 用户头像 | 3 | 0a7f628 v2.6 |
| E5 | 验证、修复与收尾 | 3 | ce009b1 → 47af429 |

---

## Epic E1：认证与后端基建

> **目标**：搭建 Django 后端骨架 + Token 认证，前端对接登录/注册

### Story E1-S1：Django 项目初始化

**作为** 开发者
**我想要** 一个可运行的 Django + DRF 项目骨架
**以便** 后续开发 API

**验收**：
- [x] `pip install -r requirements.txt` 成功（Django, djangorestframework, django-cors-headers, djangorestframework.authtoken, Pillow）
- [x] `python manage.py migrate` 成功
- [x] `python manage.py runserver 0.0.0.0:8000` 启动无报错
- [x] CORS 配置允许前端 8443 端口

**对应实现**：
- `backend/quicktask/settings.py` — INSTALLED_APPS + CORS_ALLOWED_ORIGINS
- `backend/quicktask/urls.py` — 默认 DRF browsable API
- `backend/requirements.txt`

**对应提交**：`32f1058 v0.2`（后端脚手架）

---

### Story E1-S2：注册 + 登录 + Token 认证

**作为** 用户
**我想要** 能够注册新账号、用账号密码登录
**以便** 获得专属的任务列表

**验收**：
- [x] `POST /api/auth/register/` → `{username, password}` → `{token, user: {id, username}}`
- [x] `POST /api/auth/login/` → 同上
- [x] `POST /api/auth/logout/` → 删除当前 Token
- [x] 未带 Token 请求 API → 401
- [x] admin/admin123 默认账号可用（init_admin.py 幂等脚本）

**对应实现**：
- `backend/tasks/views.py` — RegisterView / LoginView / LogoutView
- `backend/tasks/urls.py` — `/api/auth/` 路由
- `backend/tasks/serializers.py` — UserSerializer（输出驼峰 dueDate）
- `backend/init_admin.py`

**对应提交**：`7fe7a26 v1.0`（登录认证）

---

### Story E1-S3：前端登录页 + Token 管理

**作为** 用户
**我想要** 浏览器打开就看到登录页，登录后自动进入任务列表
**以便** 开始使用应用

**验收**：
- [x] 未登录状态 → 显示登录/注册切换表单
- [x] 登录成功 → Token 存 `localStorage.quicktask.token`
- [x] 刷新页面 → Token 仍在 → 自动进入应用
- [x] 所有 fetch 请求加 `Authorization: Token xxx`
- [x] 收到 401 → 自动清 Token + 跳回登录页

**对应实现**：
- `src/api.ts` — `authApi`（login/register/logout/me）+ `request()` helper 自动加 Token
- `src/App.tsx` — 登录态管理 + AuthView 组件

**对应提交**：`7fe7a26 v1.0`

---

## Epic E2：Task CRUD API

> **目标**：后端 Task 模型 + 完整 CRUD API，前端对接

### Story E2-S1：Task 模型 + Serializer

**作为** 开发者
**我想要** Django Task 模型和 DRF Serializer
**以便** 存储和序列化任务数据

**验收**：
- [x] Task 模型：id, owner, title, category, due_date, completed, created_at, updated_at
- [x] Serializer 输出 dueDate（驼峰），保持前端现有字段名不变
- [x] Migration 链完整，`python manage.py migrate` 无报错

**对应实现**：
- `backend/tasks/models.py`
- `backend/tasks/serializers.py` — TaskSerializer + TaskCreateUpdateSerializer（两 serializer 模式）
- `backend/tasks/migrations/0001_initial.py`

**对应提交**：`7fe7a26 v1.0`

---

### Story E2-S2：Task ViewSet + 权限

**作为** 用户
**我想要** 一个只返回我自己任务的 CRUD 接口
**以便** 多用户隔离

**验收**：
- [x] `GET /api/tasks/` → 只返回当前用户的任务
- [x] `POST /api/tasks/` → 自动设 owner = request.user
- [x] 非 owner 修改/删除 → 403
- [x] POST 响应返回完整对象（id, owner, created_at, updated_at）
- [x] `?category=工作` 过滤
- [x] `?status=active/completed` 过滤

**对应实现**：
- `backend/tasks/views.py` — TaskViewSet（重写 create/update/partial_update 解决两 serializer 响应问题）
- `backend/tasks/permissions.py` — IsOwnerOrReadOnly

**对应提交**：`ce009b1`（修复 POST 丢失 id 的问题）

---

### Story E2-S3：前端对接 API

**作为** 用户
**我想要** 登录后看到从后端加载的任务列表
**以便** 真实的数据持久化

**验收**：
- [x] `src/api.ts` — `taskApi.list / create / update / remove`
- [x] `App.tsx` — 启动时调 `taskApi.list()` 加载
- [x] 新增任务 → `taskApi.create()` → 刷新列表
- [x] 所有列表操作（筛选/搜索/删除）都用 API

**对应实现**：
- `src/api.ts` — taskApi 全部方法
- `src/App.tsx` — 移除 demoTasks / localStorage，纯 API 模式

**对应提交**：`7fe7a26 v1.0`

---

## Epic E3：前端增强功能

> **目标**：日历视图 + 筛选搜索 + 已完成快捷删除

### Story E3-S1：日历视图

**作为** 用户
**我想要** 一个月视图的日历，看到哪些天有任务
**以便** 快速掌握任务分布

**验收**：
- [x] 月网格布局（周一到周日）
- [x] 有任务的日期格子显示小圆点
- [x] 点击日期 → 显示当天任务列表
- [x] 上一月 / 下一月 / 今天 切换按钮

**对应实现**：
- `src/App.tsx` — CalendarView 组件（约 200 行）
- `src/index.css` — 日历全套样式

**对应提交**：`320e03b v2.3` + `iteration-8.md`

---

### Story E3-S2：筛选与搜索

**作为** 用户
**我想要** 按分类、按完成状态、按标题三种方式筛选
**以便** 快速找到任务

**验收**：
- [x] 状态筛选：全部 / 待完成 / 已完成（各带计数）
- [x] 分类筛选：从已有任务里动态提取
- [x] 标题搜索：输入框 + 清除按钮
- [x] 三个筛选条件可以组合使用

**对应实现**：
- `src/App.tsx` — filterTasks 函数 + FilterBar 组件
- `backend/tasks/views.py` — get_queryset 支持 category/status 参数

**对应提交**：`320e03b v2.3`

---

### Story E3-S3：已完成任务快捷删除

**作为** 用户
**我想要** 已完成的任务条上直接有一个删除按钮
**以便** 省掉点三点菜单的步骤

**验收**：
- [x] 已完成任务 → 显示垃圾桶图标按钮（`.quick-delete-button`）
- [x] 未完成任务 → 保持三点菜单（编辑 + 删除）
- [x] 点击垃圾桶 → 二次确认弹窗 → 删除
- [x] CSS：hover 变红

**对应实现**：
- `src/App.tsx` — 任务条渲染分岔（completed vs not）
- `src/index.css` — quick-delete-button 样式（33 行）

**对应提交**：`iteration-11.md` 对应迭代

---

## Epic E4：用户头像

> **目标**：UserProfile 模型 + 头像上传 API + 前端头像入口

### Story E4-S1：UserProfile 模型 + 迁移

**作为** 开发者
**我想要** 一个跟 User 关联的 Profile 模型来存头像
**以便** 不修改 Django 内置 User

**验收**：
- [x] UserProfile OneToOneField(User) CASCADE
- [x] avatar = ImageField(upload_to="avatars/%Y/%m/")
- [x] 迁移应用成功
- [x] User 创建时自动建 Profile（signals post_save）

**对应实现**：
- `backend/users/models.py`
- `backend/users/signals.py`
- `backend/users/migrations/0001_initial.py`

**对应提交**：`0a7f628 v2.6`

---

### Story E4-S2：头像上传 API

**作为** 用户
**我想要** 通过 API 上传 / 清除头像
**以便** 顶栏展示个性化头像

**验收**：
- [x] `POST /api/users/avatar/` → multipart `{avatar: <file>}`
- [x] 后端校验：≤ 2MB、类型白名单 jpg/png/webp/gif
- [x] 上传新图自动删除旧图（避免磁盘堆积）
- [x] `DELETE /api/users/avatar/` → 清除
- [x] `GET /api/auth/me/` 返回 avatar **完整 URL**（非相对路径）

**对应实现**：
- `backend/users/views.py` — AvatarUploadView
- `backend/users/urls.py` — `/api/users/avatar/`
- `backend/quicktask/settings.py` — MEDIA_ROOT / MEDIA_URL
- `backend/tasks/serializers.py` — UserSerializer 加 avatar SerializerMethodField

**对应提交**：`0a7f628 v2.6`

---

### Story E4-S3：前端头像入口

**作为** 用户
**我想要** 点击顶栏头像按钮可以上传 / 清除头像
**以便** 个性化展示

**验收**：
- [x] 有头像 → 显示 `<img>`（圆形裁切）
- [x] 无头像 → 显示用户名首字母（`.avatar-initial`）
- [x] 点击头像 → 下拉菜单：上传头像 / 清除头像
- [x] `<input type="file" accept="image/*">` → 2MB + 类型校验
- [x] 上传中显示 loading spinner
- [x] 上传成功 → 顶栏头像即时刷新
- [x] 清除成功 → 回退到首字母

**对应实现**：
- `src/api.ts` — `authApi.uploadAvatar / clearAvatar`
- `src/App.tsx` — Avatar 组件（约 80 行，修复 useRef 错写 useState bug）
- `src/index.css` — 头像全套样式（约 96 行）

**对应提交**：`ce009b1`（useRef 修复）+ `iteration-10.md`

---

## Epic E5：验证与修复

> **目标**：沙箱端到端验证 + 修复 bug + BMAD 交付就绪

### Story E5-S1：沙箱端到端验证（17/17 PASS）

**作为** 开发者
**我想要** 一套自动跑的 E2E 测试来验证全部 API
**以便** 交付前确认所有功能正常

**验收**：
- [x] 认证 4 项：注册 / 登录 / 401 / auth/me 带 avatar URL
- [x] Task CRUD 4 项：POST 完整响应 / category 过滤 / PATCH / DELETE
- [x] 头像 7 项：上传 / 完整 URL / 静态直链 / 覆盖删旧图 / 清除 / 超大小 400 / 非图片 400
- [x] 壳 + CORS 2 项：Vite index.html / OPTIONS preflight

**对应实现**：
- PowerShell Invoke-WebRequest 脚本（不受 CORS 限制，直接测 Django API）

**对应产物**：`_bmad-output/implementation-artifacts/iteration-9.md`

---

### Story E5-S2：修复沙箱暴露的 3 个 bug

| Bug | 根因 | 修复 |
|-----|------|------|
| Avatar useRef 错写 useState | `const fileInputRef = useState(null)` 返回元组，`fileInputRef[0]` 永远是 null → 文件选择框永远不弹 | 改为 `useRef<HTMLInputElement>(null)` |
| Task POST 响应丢 id | TaskCreateUpdateSerializer fields 不含 id | 重写 create/update：输入用简化 serializer，渲染用完整 TaskSerializer |
| formatDate 空值 RangeError | `dueDate` 为 null 时 `new Date(null).toLocaleDateString()` 抛错 | 加 `!date ? '—' : ...` 空值保护 |

**对应提交**：`ce009b1 修复了加载无法启动和null值错误读取的问题`

---

### Story E5-S3：BMAD 交付补齐

| 项 | 状态 | 说明 |
|----|------|------|
| 分支 + 合并痕迹 | ✅ | `feature/branch-proof → merge --no-ff` |
| 规划阶段产物齐全 | ✅ | product-brief.md + architecture.md + spec.md + epics-and-stories.md |
| 实现/验证产物齐全 | ✅ | iteration-7~11.md + build-report.md + iteration-notes.md |
| conventional commit | ⚠️ | 早期迭代用版本号（v0.1→v2.6），后期逐步规范。补充说明里解释演进过程 |
| 补充说明文档 | ✅ | 已填模板 |

**对应提交**：本分支（feature/planning-artifacts → merge --no-ff）

---

## 时间线（真实迭代）

| 日期 | 迭代 | 做了什么 | commit |
|------|------|---------|--------|
| 2026-10-20 | v0.1 | Figma Make 脚手架 + React + Vite + Tailwind v4 | `141f8e3` |
| 2026-10-21 | v0.2 | Django 后端脚手架 + BMAD Skills 安装 + .trae/skills/ | `32f1058` |
| 2026-10-22 | v1.0 | 登录认证 + Task CRUD API + 前端对接 | `7fe7a26` |
| 2026-10-23 | v2.3 | 日历视图 + 筛选搜索 | `320e03b` |
| 2026-10-24 | v2.6 | 头像上传（后端 UserProfile + API） | `0a7f628` |
| 2026-10-25 | 沙箱 | 端到端验证 + 2 个后端 bug 修复 | `ce009b1` |
| 2026-10-26 | 最终 | formatDate 空值修复 + 分支合并证据 + 规划产物补齐 | `f4a3abe` + 本次 merge |
