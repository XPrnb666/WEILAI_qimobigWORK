# QuickTask 需求规格（SPEC）

> 生成日期：2026-10-21
> 状态：已实现（与实际开发内容一致）
> 关联产物：product-brief.md、architecture.md

---

## 1. 项目概述

QuickTask 是一个**前后端分离**的个人待办事项应用，用于课程大作业展示。用户通过浏览器访问，登录后管理自己的待办任务。

### 1.1 技术栈

| 层 | 选型 |
|----|------|
| 前端 | React 19 + Vite 8 + TypeScript 5.7 + Tailwind CSS v4 |
| 后端 | Django 5.x + Django REST Framework |
| 认证 | DRF TokenAuthentication（每个用户一个固定 Token）|
| 数据库 | SQLite（Django 默认，零配置）|
| CORS | django-cors-headers |
| 运行端口 | 前端 8443 / 后端 8000 |

### 1.2 核心流程

```
打开浏览器 → 访问 http://localhost:8443 → 登录/注册
→ 进入任务列表页 → 新增/编辑/完成/删除任务
→ 切换日历视图查看每日任务分布
→ 上传/更换个人头像
→ 完成后登出
```

---

## 2. 功能需求规格

### FR-1 账号认证

| 编号 | 需求 | 优先级 | 状态 |
|------|------|--------|------|
| FR-1.1 | 用户可以通过用户名 + 密码注册新账号 | P0 | ✅ 已实现 |
| FR-1.2 | 已注册用户可以通过用户名 + 密码登录 | P0 | ✅ 已实现 |
| FR-1.3 | 登录成功后后端返回 Token，前端存 localStorage | P0 | ✅ 已实现 |
| FR-1.4 | 所有 API 请求带 `Authorization: Token xxx` Header | P0 | ✅ 已实现 |
| FR-1.5 | 未登录访问 API 返回 401 | P0 | ✅ 已实现 |
| FR-1.6 | 用户可以登出（删除 Token） | P0 | ✅ 已实现 |
| FR-1.7 | 前端收到 401 自动清除本地 Token 并跳登录页 | P1 | ✅ 已实现 |

### FR-2 任务 CRUD

| 编号 | 需求 | 优先级 | 状态 |
|------|------|--------|------|
| FR-2.1 | 登录后显示当前用户的所有任务 | P0 | ✅ 已实现 |
| FR-2.2 | 可以新增任务：标题（必填）、分类（默认"通用"）、截止日期（可空）| P0 | ✅ 已实现 |
| FR-2.3 | 可以编辑任务（弹窗表单，预填原值）| P0 | ✅ 已实现 |
| FR-2.4 | 可以切换任务完成状态（圆形复选框）| P0 | ✅ 已实现 |
| FR-2.5 | 可以删除任务（二次确认弹窗）| P0 | ✅ 已实现 |
| FR-2.6 | 已完成任务显示删除线 + 绿色背景 | P1 | ✅ 已实现 |

### FR-3 筛选与搜索

| 编号 | 需求 | 优先级 | 状态 |
|------|------|--------|------|
| FR-3.1 | 可以按完成状态筛选：全部 / 待完成 / 已完成（各带计数）| P1 | ✅ 已实现 |
| FR-3.2 | 可以按分类筛选 | P1 | ✅ 已实现 |
| FR-3.3 | 可以按标题模糊搜索 | P1 | ✅ 已实现 |
| FR-3.4 | 已完成任务的快捷删除按钮（跳过三点菜单）| P2 | ✅ 已实现 |

### FR-4 日历视图

| 编号 | 需求 | 优先级 | 状态 |
|------|------|--------|------|
| FR-4.1 | 月网格布局，每周一到周日 | P2 | ✅ 已实现 |
| FR-4.2 | 有任务的日期格子显示小圆点 | P2 | ✅ 已实现 |
| FR-4.3 | 点击日期显示当天任务列表 | P2 | ✅ 已实现 |
| FR-4.4 | 可以切换月份（上一月 / 下一月 / 今天）| P2 | ✅ 已实现 |

### FR-5 用户头像

| 编号 | 需求 | 优先级 | 状态 |
|------|------|--------|------|
| FR-5.1 | 顶栏显示头像（有图显示图片，无图显示用户名首字母）| P2 | ✅ 已实现 |
| FR-5.2 | 点击头像打开下拉菜单：上传 / 清除 | P2 | ✅ 已实现 |
| FR-5.3 | 支持上传 jpg / png / webp / gif 格式，大小 ≤ 2MB | P2 | ✅ 已实现 |
| FR-5.4 | 上传时前端 + 后端双重校验文件类型和大小 | P2 | ✅ 已实现 |
| FR-5.5 | 上传新头像时自动删除服务器上旧头像文件 | P2 | ✅ 已实现 |
| FR-5.6 | 可以清除头像（删除服务器文件）| P2 | ✅ 已实现 |

### FR-6 多用户隔离

| 编号 | 需求 | 优先级 | 状态 |
|------|------|--------|------|
| FR-6.1 | 每个用户只能看到自己的任务 | P0 | ✅ 已实现 |
| FR-6.2 | 每个用户的头像独立存储（按用户目录组织）| P2 | ✅ 已实现 |
| FR-6.3 | UserProfile 模型 OneToOne 关联 auth.User | P2 | ✅ 已实现 |

---

## 3. 非功能需求

| 编号 | 需求 | 指标 | 状态 |
|------|------|------|------|
| NFR-1 | 构建通过 | `pnpm build` 0 错误 | ✅ |
| NFR-2 | TypeScript 严格模式 | 0 错误 | ✅ |
| NFR-3 | API 响应时间 | 列表接口 P95 < 500ms | ✅（本地 SQLite）|
| NFR-4 | CORS 正确配置 | OPTIONS preflight 返回 200 | ✅ |
| NFR-5 | 响应式布局 | 桌面端 + 移动端（≤420px）无明显问题 | ✅ |

---

## 4. API 契约

### 认证 API

| 方法 | URL | 认证 | 说明 |
|------|-----|------|------|
| POST | `/api/auth/login/` | 否 | `{username, password}` → `{token, user}` |
| POST | `/api/auth/register/` | 否 | `{username, password}` → `{token, user}` |
| POST | `/api/auth/logout/` | 是 | 删除当前 Token |
| GET | `/api/auth/me/` | 是 | 返回当前用户信息 + avatar 完整 URL |

### Task API

| 方法 | URL | 认证 | 说明 |
|------|-----|------|------|
| GET | `/api/tasks/` | 是 | 列表（支持 `?category=xxx` `?status=active/completed`）|
| POST | `/api/tasks/` | 是 | 新建（返回完整对象含 id/owner/timestamps）|
| PATCH | `/api/tasks/{id}/` | 是 | 更新（返回完整对象）|
| DELETE | `/api/tasks/{id}/` | 是 | 删除 |

### 头像 API

| 方法 | URL | 认证 | 说明 |
|------|-----|------|------|
| POST | `/api/users/avatar/` | 是 | multipart `{avatar: <file>}` |
| DELETE | `/api/users/avatar/` | 是 | 清除头像 |

### 通用响应格式

```
成功：200 OK / 201 Created → JSON 对象
未认证：401 Unauthorized → { "detail": "Authentication credentials were not provided." }
参数错误：400 Bad Request → { "field": ["error message"] }
权限不足：403 Forbidden
资源不存在：404 Not Found
```

---

## 5. 验收标准

### AC-1 认证验收

1. 注册新用户 → 返回 token + 用户信息 ✅
2. 已注册用户登录 → 返回 token ✅
3. 未带 Token 访问 `/api/tasks/` → 返回 401 ✅
4. 登出后 Token 失效 → 再请求返回 401 ✅

### AC-2 任务验收

1. 新建任务 → 返回 201 + 完整对象（id, owner, created_at）✅
2. 列表接口返回当前用户全部任务 ✅
3. PATCH 更新 → 返回完整对象 ✅
4. DELETE 删除 → 204 No Content ✅
5. 分类筛选 `?category=工作` 只返回工作类任务 ✅

### AC-3 头像验收

1. 上传 ≤ 2MB 的 jpg → 200 + 完整 URL（`http://localhost:8000/media/avatars/...`）✅
2. `auth/me` 返回的 avatar 是完整 URL（不是相对路径）✅
3. 上传 > 2MB 的文件 → 400 拒绝 ✅
4. 上传非图片类型 → 400 拒绝 ✅
5. 覆盖上传旧图 → 服务器旧文件自动删除 ✅
6. 清除头像 → 200 + 服务器文件删除 ✅

### AC-4 前端构建验收

1. `pnpm build` 成功，无 TS 错误 ✅
2. 浏览器 Console 无运行时错误 ✅
3. Vite dev server 热更新正常 ✅

---

## 6. 数据模型（后端）

### UserProfile（新增）

| 字段 | 类型 | 说明 |
|------|------|------|
| user | OneToOneField(User) | CASCADE，关联 Django auth.User |
| avatar | ImageField | upload_to="avatars/%Y/%m/"，可空 |
| updated_at | DateTimeField | auto_now=True |

### Task

| 字段 | 类型 | 说明 |
|------|------|------|
| id | AutoField | 主键 |
| owner | ForeignKey(User) | CASCADE |
| title | CharField(200) | 任务标题 |
| category | CharField(100) | 默认"通用" |
| due_date | DateField | 可空 |
| completed | BooleanField | 默认 False |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |
