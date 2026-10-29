# 迭代 7 — Django 后端 + 登录功能

**日期**：2026-10-21
**触发者**：用户请求"利用 Django 框架搭建对应的后端，写整齐对应的字段，然后添加一个登录功能"
**类型**：架构级变更（从纯前端 → 前后端分离）

---

## 目标 & 约束

- Django 5.x + DRF，SQLite 零配置（课程作业不需要 MySQL）
- TokenAuthentication（比 JWT 简单，比 Session 少跨域）
- 前端完全切换到 API 调用，不做 localStorage 双写
- 后端写进本地项目 `backend/` 子目录
- 不修改 `_bmad/` 安装目录

---

## 产出文件清单

### 新建

| 文件 | 大小 | 说明 |
|------|------|------|
| `backend/requirements.txt` | 3 行 | Django 5.2, DRF 3.18, django-cors-headers |
| `backend/init_admin.py` | 43 行 | 幂等 admin/admin123 初始化脚本 |
| `backend/tasks/models.py` | 29 行 | Task 模型（8 字段） |
| `backend/tasks/serializers.py` | 60 行 | 驼峰/蛇形转换、owner 防伪造 |
| `backend/tasks/views.py` | 107 行 | 4 个认证视图 + 1 个 TaskViewSet |
| `backend/tasks/urls.py` | 16 行 | DRF Router + auth 路由 |
| `src/api.ts` | 99 行 | 前端 fetch 封装（authApi / taskApi / AuthError） |
| `_bmad-output/planning-artifacts/architecture.md` | 7.3 KB | 完整架构决策文档 |
| `_bmad-output/implementation-artifacts/iteration-7.md` | 本文件 | 迭代 7 独立记录 |

### 修改

| 文件 | 关键变更 |
|------|----------|
| `backend/quicktask/settings.py` | INSTALLED_APPS 加 rest_framework, authtoken, corsheaders, tasks；MIDDLEWARE 加 CorsMiddleware；DRF 配置 + CORS |
| `backend/quicktask/urls.py` | 加 `/api/` 前缀挂 tasks.urls |
| `src/App.tsx` | 移除 localStorage / demoTasks，加 auth state + 登录界面 + 乐观更新 |
| `src/index.css` | 加登录卡片/Tab/表单/错误条/登出按钮样式（约 190 行新 CSS）|
| `README.md` | 完整重写（技术栈、后端启动、Demo 账号、API 快速参考、项目结构）|
| `_bmad-output/implementation-artifacts/build-report.md` | 追加 Django 构建 + 第 6 次前端构建 |
| `_bmad-output/implementation-artifacts/iteration-notes.md` | 追加迭代 7 摘要 |

---

## 数据库模型

```python
class Task(models.Model):
    owner = ForeignKey(User)        # 多用户隔离
    title = CharField(200)
    category = CharField(100, default='通用')
    due_date = DateField(null=True)
    completed = BooleanField(False)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

---

## 执行命令（可复现）

```bash
# 1. 安装后端依赖
cd backend && pip install -r requirements.txt

# 2. 建表（21 条迁移：auth 6 + authtoken 4 + contenttypes/admin/sessions + tasks 1）
python manage.py migrate

# 3. 创建 admin（幂等，可重复执行）
python manage.py shell -c "exec(open('init_admin.py').read())"

# 4. 启动后端（localhost:8000）
python manage.py runserver 0.0.0.0:8000

# 5. 前端构建（localhost:8443）
pnpm install && pnpm dev
```

---

## API 测试结果（真实 Invoke-RestMethod 调用）

| 测试 | 请求 | 结果 |
|------|------|------|
| 登录 | POST /api/auth/login/ {username:"admin", password:"admin123"} | ✅ 返回 token + user |
| 创建 Task | POST /api/tasks/ {title, category, dueDate} | ✅ 返回完整 Task（含 owner） |
| 列表 | GET /api/tasks/ with Authorization: Token xxx | ✅ 仅当前用户的任务 |
| 无 token | GET /api/tasks/ 无 Header | ✅ 401 |
| 错误密码 | POST /api/auth/login/ 密码错 | ✅ 401 "用户名或密码错误" |

---

## 前端启动流程

```
bootstrap()
  → authApi.getToken() 读 localStorage
  → authApi.me()        Token 有效？加载用户信息
  → 是 → taskApi.list() 加载任务列表
  → 否 → 清 Token，显示登录界面
```

401 自动处理：`AuthError` 抛出 → 清 Token → 用户跳回登录页。

---

## 经验教训应用（召回 experience 179090 / 1343673）

| 教训 | 落实 |
|------|------|
| `rest_framework.authtoken` 必须加 INSTALLED_APPS | ✅ 已加（经验 179090：没加会导致 Token 表不存在） |
| admin 脚本用幂等 get_or_create | ✅ init_admin.py 幂等，可重复 |
| 不要删除迁移文件 | ✅ 21 条迁移完整保留 |
| 驼峰/蛇形在 serializer 层转换 | ✅ dueDate ↔ due_date 映射，前端不动 |
| CORS 开发阶段宽松、生产收紧 | ✅ CORS_ALLOW_ALL_ORIGINS=True（注释里说明了生产要改） |

---

## 已知遗留

- Git 未提交（7 个改动文件全在工作区）
- 没有自动化测试（前端 Vitest / 后端 pytest）
- README 里 API 参考表可以改成 DRF 的 docs 链接（待评估）
- dist/ 已重建（2026-10-21 20:41:36），但没有纳入版本控制
