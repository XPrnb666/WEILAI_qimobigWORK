# 迭代 10 — 头像上传 / 修改

**日期**：2026-10-22
**触发者**：用户请求"新增一个上传/修改头像的功能吧，前端同步添加头像的入口"
**类型**：功能增强（用户 Profile + 文件上传）

---

## 后端新增

### 新增文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `backend/users/models.py` | 28 | UserProfile（OneToOneField → auth.User，avatar=ImageField）|
| `backend/users/views.py` | 102 | AvatarUploadView（POST 上传 / DELETE 清除，2MB+类型校验，删旧图）|
| `backend/users/urls.py` | 8 | `/api/users/avatar/` |
| `backend/users/migrations/0001_initial.py` | 自动生成 | Create model UserProfile |

### 修改文件

| 文件 | 改动 |
|------|------|
| `backend/quicktask/settings.py` | INSTALLED_APPS 加 `users`；加 `MEDIA_URL` / `MEDIA_ROOT` |
| `backend/quicktask/urls.py` | 加 `users.urls` 路由 + `static(MEDIA_URL, MEDIA_ROOT)`（DEBUG 下 serve 头像文件）|
| `backend/tasks/serializers.py` | UserSerializer 加 `avatar = SerializerMethodField()`，`get_avatar()` 从 `obj.profile.avatar` 取 |
| `backend/tasks/views.py` | CurrentUserView 的 UserSerializer 加 `context={"request": request}`（否则返回相对路径不是完整 URL）|

### 数据模型

```python
class UserProfile(models.Model):
    user   = OneToOneField(User, related_name="profile")
    avatar = ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)
```

**设计选择**：用 OneToOne Profile 而不是自定义 User 模型——避免破坏既有迁移（auth.User 主键已创建），课程作业够用。

Signal `post_save`（users/views.py）确保每次创建 User 自动创建对应 UserProfile（幂等 get_or_create）。

### API

| 方法 | URL | 认证 | 说明 |
|------|-----|------|------|
| POST | `/api/users/avatar/` | ✅ | multipart/form-data `{ avatar: <file> }` — 返回 `{ avatar: "完整 URL" }` |
| DELETE | `/api/users/avatar/` | ✅ | 清除头像（同时删磁盘旧文件）|
| GET | `/api/auth/me/` | ✅ | 返回 `{ id, username, avatar }`（头像为完整 URL 或 ""）|

校验：
- 类型：jpg / jpeg / png / webp / gif
- 大小：≤ 2MB
- 上传成功后自动删除磁盘上的旧头像文件（避免堆积）

---

## 前端改动

### 新增文件：无（Avatar 组件内联）

### 修改

| 文件 | 改动 |
|------|------|
| `src/api.ts` | AuthUser 加 `avatar: string`；authApi 加 `uploadAvatar(file: File)` 和 `clearAvatar()`（FormData 直 fetch，不走 request<T>）|
| `src/App.tsx` | +130 行：`Avatar` 组件（点击 → 菜单 → 上传 / 清除；空状态显示用户名首字母；上传中 loading spinner）；`handleAvatarUpload` / `handleAvatarClear`；user-area 加入 Avatar 组件 |
| `src/index.css` | +96 行：`.avatar-wrapper` / `.avatar-btn` / `.avatar-btn.has-img` / `.avatar-initial` / `.avatar-loading` / `.avatar-menu` + `avatar-spin` 动画 |

### Avatar 组件交互

```
顶栏 user-area:
  [Avatar]  你好，admin  [退出]
     ↑
  点击弹出菜单一键：
    更换头像
    清除头像（仅当已上传）

  上传：
    → 原生 <input type="file" accept="image/*">
    → 前端校验 2MB + 类型
    → fetch POST FormData → /api/users/avatar/
    → 返回新 URL → setUser({...u, avatar}) → 即时显示

  清除：
    → fetch DELETE → /api/users/avatar/
    → 头像按钮恢复首字母
```

---

## 执行命令（可复现）

```bash
# 后端（users app 从零）
cd backend
python manage.py startapp users                 # 已做
# 写好 models/views/urls 之后
python manage.py makemigrations users
python manage.py migrate

# 前端（已在迭代 8 的 Vite dev server 热更新）
pnpm build                                      # 289ms, CSS 29.45 KB
```

---

## API 实际测试（Invoke-RestMethod）

| 测试 | 结果 |
|------|------|
| 登录 admin/admin123 | ✅ 返回 token |
| POST /api/users/avatar/ 上传 1x1 PNG（base64）| ✅ 返回 `http://localhost:8000/media/avatars/2026/10/avatar-test.png` |
| GET /api/auth/me/（带 request context）| ✅ avatar 字段返回完整 URL |
| GET /api/auth/me/（未带 request context——已修）| ❌ 之前只返回相对路径 `/media/...`，已修复 CurrentUserView |
| 无 token | ✅ 401 |

**修复点**：CurrentUserView 的 `UserSerializer(request.user)` → `UserSerializer(request.user, context={"request": request})`，否则 serializer 里 `request.build_absolute_uri()` 拿不到 request，只返回相对路径。

---

## 构建验证

```bash
pnpm build
# ✓ 289ms
# CSS: 28.11 KB → 29.45 KB（+1.3 KB 头像样式）
# JS: 214.55 KB（Avatar 组件代码 + api.ts 新增的 40 行）
```

无头 Chrome dump-dom 确认：
- `.avatar-wrapper` ✅
- `.avatar-btn` ✅
- `.avatar-menu` ✅

---

## 已知局限

1. **头像文件不做 resize / 压缩**——用户传 2MB 以内直接存；生产环境应该加 Pillow 自动缩到 200×200
2. **菜单点击外部不自动收起**——当前仅点击按钮切换；课程作业够用
3. **uploadAvatar / clearAvatar 没走 request<T> 封装**——因为 request<T> 里固定了 `Content-Type: application/json`，FormData 需要浏览器自动带 boundary header；单独写 fetch 更干净
4. **头像 URL 构造依赖 request context**——CurrentUserView 已修；如果 TaskViewSet 里也返回 UserSerializer，需同样处理

---

## 经验教训应用

| 教训（来自 experience 998981 等）| 落实 |
|------|------|
| 别改 auth.User 直接加头像字段 | ✅ 用 UserProfile OneToOne 扩展 |
| 列表接口和详情接口字段要一致 | ✅ 登录 / auth/me / tasks 接口里的 UserSerializer 都带 avatar |
| 图片大小校验（2MB 上限）| ✅ 后端和前端双重校验 |
| 上传后删旧图 | ✅ profile.avatar.save() 前记录 old_path，save 后 os.remove |
| 拆小步 Edit 避免整段替换失败 | ✅ 分别改 UserSerializer（加 SerializerMethodField 行 + get_avatar 方法 + Meta.fields）和 CurrentUserView（一行 context 修改） |

---

## 本次独立输出

- `_bmad-output/implementation-artifacts/iteration-10.md`（本文件）
