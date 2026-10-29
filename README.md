# QuickTasks

一个简洁的个人待办事项课程大作业，前后端分离架构。支持登录注册、任务的新增/编辑/完成/删除/筛选/搜索。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 |
| 后端 | Django 5.2 + Django REST Framework 3.18 |
| 认证 | DRF TokenAuthentication（每个用户一个固定 Token） |
| 跨域 | django-cors-headers |
| 数据库 | SQLite（Django 默认，零配置） |

---

## 功能

### 认证
- 用户名密码登录 / 注册
- 登出（服务端删除当前 Token）
- Demo 账号：`admin` / `admin123`
- Token 存浏览器 localStorage，刷新自动校验

### 任务（登录后）
- 任务展示：标题、分类、截止日期、完成状态、创建/更新时间
- 新增 / 编辑（弹窗表单：标题、分类、截止日期三个必填）
- 完成状态切换（圆形复选框，乐观更新）
- 删除（二次确认弹窗 + API 删除）
- 筛选（全部 / 待完成 / 已完成，带数量统计）
- 搜索（按任务标题模糊匹配）
- 空状态友好提示 + 6 条可点击示例任务
- **多用户隔离**：每个用户只能看到和修改自己的任务
- 响应式设计（桌面端 + 移动端浮动按钮）

---

## 快速开始

### 1. 启动 Django 后端（端口 8000）

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py shell -c "exec(open('init_admin.py').read())"   # 幂等创建 admin/admin123
python manage.py runserver 0.0.0.0:8000
```

后端启动后访问 http://localhost:8000/api/ 能看到 DRF 的可浏览 API 根（未带 Token 的接口会返回 401）。

### 2. 启动 React 前端（端口 8443）

另开一个终端：

```bash
pnpm install
pnpm dev
```

访问 http://localhost:8443/ → 先看到登录界面 → 用 `admin / admin123` 登录。

### 3. 生产构建

```bash
pnpm build      # 前端，产物输出到 dist/
pnpm preview    # 本地预览构建产物
```

---

## API 快速参考

所有 `/api/tasks/*` 接口需要认证；在 Header 加：

```
Authorization: Token <你的 token>
```

| 方法 | URL | 说明 | 认证 |
|------|-----|------|------|
| POST | `/api/auth/login/` | 登录（body: `{username, password}`）| ❌ |
| POST | `/api/auth/register/` | 注册（body: `{username, password}`）| ❌ |
| POST | `/api/auth/logout/` | 登出（删除当前 Token）| ✅ |
| GET | `/api/auth/me/` | 获取当前用户（刷新时校验 Token 是否仍然有效）| ✅ |
| GET | `/api/tasks/` | 列出当前用户所有任务 | ✅ |
| POST | `/api/tasks/` | 新建任务（body: `{title, category?, dueDate?, completed?}`）| ✅ |
| GET | `/api/tasks/{id}/` | 获取单个任务 | ✅ |
| PATCH | `/api/tasks/{id}/` | 局部更新 | ✅ |
| DELETE | `/api/tasks/{id}/` | 删除 | ✅ |

字段命名：前端驼峰 `dueDate` → Django 蛇形 `due_date`（DRF serializer 自动处理，前端不用改）。

---

## 项目结构

```
QuickTasks/
├── backend/                       Django 后端
│   ├── manage.py
│   ├── requirements.txt
│   ├── init_admin.py              幂等 admin 初始化脚本
│   ├── quicktask/                 Django 项目包（settings, urls, wsgi）
│   ├── env.example                环境变量示例（SECRET_KEY / DEBUG / CORS）
│   ├── tasks/                     Task App（模型、序列化器、视图、测试）
│   └── users/                     用户头像上传 / 删除
├── src/                           React 前端
│   ├── App.tsx                    主应用（登录 + 任务 CRUD + 乐观更新）
│   ├── api.ts                     Django API 封装（authApi / taskApi）
│   ├── main.tsx
│   ├── CalendarView.tsx           日历视图组件（月网格 + 月度概览）
│   ├── calendar-utils.ts          日期与分类配色工具函数
│   └── index.css                  Tailwind v4 + 自定义样式
├── _bmad-output/                  BMAD 工作流产物
│   ├── planning-artifacts/        产品简报、架构说明、PRD 等
│   └── implementation-artifacts/   构建记录、迭代笔记、预览参考
├── AGENTS.md                      项目级 BMAD 工作流规则 + Figma Make 技术说明
├── package.json
├── vite.config.ts
└── README.md                      ← 你现在读的这个文件
```

---

## 已知限制（课程作业场景）

1. **没有前端自动化测试**（未接入 Vitest / Playwright / Cypress；后端已有 21 条 Django 测试）
2. **Token 不刷新**：一个用户一个长期 Token（TokenAuthentication 默认模式）
3. **密码强度验证用 Django 默认**：生产环境应该加更严格的验证器
4. **安全配置走环境变量**：`DJANGO_SECRET_KEY`、`DJANGO_DEBUG`、`DJANGO_ALLOWED_HOSTS`、`CORS_ALLOW_ALL_ORIGINS` 未设置时回退到本地开发默认值，示例见 `backend/env.example`
5. **数据库 SQLite**：并发写入有限，不适合多人同时写；生产环境应换 Postgres
6. **没有批量操作 / 拖拽排序 / 提醒通知**（MVP 范围外）
7. **搜索只匹配任务标题**（不搜索分类或描述）

---

## 测试

```bash
cd backend
python manage.py test
```

当前覆盖：登录 / 注册 / 登出 / Token 校验、任务 CRUD 与多用户隔离、分类与状态过滤、头像上传的类型 / 大小 / 删除校验，共 21 条。

---

## BMAD 工作流产物

本项目通过 BMAD-Method v6.12.4 四阶段工作流开发。所有规划/构建/测试产物位于 `_bmad-output/`，每一次迭代的改动摘要、构建记录、测试结果均已归档。

## Git 分支开发记录

- 每个独立改动都在 `feature/<功能名>` 分支上完成
- 完成后执行 `git merge --no-ff` 合回 `main`，保留可见的 merge 提交
- 完整分支列表可用 `git branch -a` 查看