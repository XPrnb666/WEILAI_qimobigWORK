# QuickTask 架构说明

> 本文档记录从「纯前端 localStorage 单页应用」架构变更为「Django 后端 + React 前端 API 调用」的决策。
> 日期：2026-10-21

---

## 变更原因

用户要求添加 Django 后端和登录功能。原 MVP 无后端、无账号的约束已放宽。

---

## 技术选型（冻结）

| 层 | 选型 | 理由 |
|----|------|------|
| 后端框架 | **Django 5.x + Django REST Framework** | Python 生态成熟；课程作业展示体面 |
| 认证 | **DRF TokenAuthentication** | 每个用户一个固定 Token，前端请求头 `Authorization: Token xxx`；简单、适合课程展示；比 JWT 少刷新逻辑，比 Session 少跨域麻烦 |
| 数据库 | **SQLite**（Django 默认） | 零配置、单文件、适合课程作业；不装 MySQL/Postgres |
| CORS | **django-cors-headers** | 允许前端 Vite 端口（8443）跨域访问 |
| 前端 | React 19 + Vite + Tailwind v4（**不变**） | 现有框架保留 |
| 前端数据层 | 完全切换为 `fetch` API 调用 | 加了登录就应该用后端数据，不再 localStorage；不做双写避免混乱 |

---

## 目录结构

```
QuickTask/
├── backend/                    ← 新增：Django 后端
│   ├── manage.py
│   ├── requirements.txt
│   ├── quicktask/              ← Django 项目包（settings.py, urls.py, wsgi.py）
│   └── tasks/                  ← Django App（Task 模型 + API）
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── migrations/
├── src/                        ← 现有前端（React + Vite + Tailwind v4）
├── package.json
├── index.html
└── README.md
```

---

## 数据模型

### Django Task 模型（后端）

字段对齐前端现有 `Task` 类型：

| Django 字段 | 类型 | 说明 |
|-------------|------|------|
| `id` | AutoField (PK) | Django 自增，整数，替换前端手动 id |
| `owner` | ForeignKey(User) | 关联 Django Auth User，实现"多用户隔离" |
| `title` | CharField(max_length=200) | 任务标题 |
| `category` | CharField(max_length=100, blank=True, default='通用') | 分类（前端现有：工作/学习/生活/个人） |
| `due_date` | DateField(null=True, blank=True) | 截止日期（蛇形命名，前端 dueDate 驼峰 → DRF 序列化时自动处理或加 serializer 映射） |
| `completed` | BooleanField(default=False) | 完成状态 |
| `created_at` | DateTimeField(auto_now_add=True) | 创建时间（新增，前端之前没有，后端自动加） |
| `updated_at` | DateTimeField(auto_now=True) | 更新时间（新增） |

### 序列化字段映射

前端 `Task.dueDate` (驼峰) → 后端 `due_date` (蛇形)。DRF 默认输出蛇形，前端需要改字段名读取。两种方案：
- **方案 A**：前端改代码读 `due_date`（快但破现有代码）
- **方案 B**：DRF Serializer 用 `SerializerMethodField` 输出 `dueDate`（保持前端不变）

**选方案 B**，最小侵入。

### Django User 模型

用 Django 默认 `auth.User`，不自定义。登录时 DRF Token 机制自动为每个 User 创建一条 Token。

---

## API 设计

### 登录

```
POST /api/auth/login/
Body: { "username": "xxx", "password": "xxx" }
返回: { "token": "xxx", "user": { "id": 1, "username": "xxx" } }
```

用 DRF 默认的 `rest_framework.authtoken.views.obtain_auth_token` 加一个小包装返回用户信息。

### 注册

```
POST /api/auth/register/
Body: { "username": "xxx", "password": "xxx" }
返回: { "token": "xxx", "user": { "id": 1, "username": "xxx" } }
```

前端只需要最简单的注册（课程作业场景）。

### 登出

```
POST /api/auth/logout/
```

删除当前 Token。

### Task API（全部需要 Token）

| 方法 | URL | 说明 |
|------|-----|------|
| GET | `/api/tasks/` | 列出当前用户的所有任务 |
| POST | `/api/tasks/` | 新建任务 |
| GET | `/api/tasks/{id}/` | 获取单个任务 |
| PUT / PATCH | `/api/tasks/{id}/` | 更新任务 |
| DELETE | `/api/tasks/{id}/` | 删除任务 |

用 DRF `ModelViewSet` + `IsAuthenticated` + `IsOwnerOrReadOnly`（自定义权限，非 owner 不能改）。

---

## 认证流程

1. 用户前端表单输入用户名密码 → `POST /api/auth/login/`
2. 后端验证密码 → 查找/创建 Token → 返回
3. 前端把 Token 存 localStorage（key: `quicktask.token`）
4. 每次 API 请求加 Header：`Authorization: Token <token>`
5. Django 通过 `TokenAuthentication` 中间件识别用户

---

## CORS 配置

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8443",
    "http://127.0.0.1:8443",
]
CORS_ALLOW_CREDENTIALS = False  # Token 方案不需要
```

---

## 迁移注意事项（经验 179090 教训）

1. **`rest_framework.authtoken` 必须加进 INSTALLED_APPS**，否则 Token 表不会创建
2. **不要删除迁移文件**，迁移链要先一致；如果出错，优先修改迁移内容而不是删
3. **`isinstance` 检查 User 时注意**默认 User 的主键是 IntegerField

---

## admin 初始化脚本（幂等，经验 179090 建议）

创建 `backend/init_admin.py`：
```python
from django.contrib.auth import get_user_model
def run():
    User = get_user_model()
    user, created = User.objects.get_or_create(
        username='admin',
        defaults={'email': 'admin@example.com'}
    )
    if created or not user.check_password('admin123'):
        user.set_password('admin123')
        user.is_staff = True
        user.is_superuser = True
        user.save()
    print(f"admin user {'created' if created else 'updated'}")
```

用 `python manage.py shell < init_admin.py` 执行，幂等可重复。

---

## 前后端数据流向

```
┌─────────────────────┐
│  React 前端 (8443)   │
│  src/App.tsx        │
│  src/api.ts (新增)   │
└─────────┬───────────┘
          │ fetch + Authorization: Token xxx
          ▼
┌─────────────────────┐
│  Django (8000)       │
│  quicktask/urls.py   │
│  tasks/views.py      │
│  tasks/models.py     │
└─────────┬───────────┘
          │ ORM
          ▼
┌─────────────────────┐
│  SQLite              │
│  db.sqlite3          │
└─────────────────────┘
```

---

## 变更影响

| 现有功能 | 变更 |
|----------|------|
| localStorage 持久化 | ❌ 移除，改为 API 调用 |
| 首次启动 12 条 demoTasks | ❌ 移除（没有用户就没有任务），改为登录后展示 |
| 空状态 6 条示例 | ✅ 保留（纯 UI 引导，不涉及存储） |
| 任务字段（title, category, dueDate, completed） | ✅ 保持 |
| 新建 Task 时手动 id | ❌ 移除，后端自增 |
| 新增 | 登录/注册/登出 |
| 新增 | 多用户隔离 |
| 新增 | created_at / updated_at |

---

## 环境安装命令

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py shell < init_admin.py  # 幂等创建 admin/admin123
python manage.py runserver 0.0.0.0:8000
```

---

## 归档约定（AGENTS.md）

所有架构决策、设计变更、构建记录 → `_bmad-output/planning-artifacts/` 或 `implementation-artifacts/`，不在根目录散落。
