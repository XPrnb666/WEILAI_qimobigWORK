# Iteration 12 — 工程化与体验问题集中修复

- 日期：2026-10-29
- 目标：清理交付风险（隐私文件、配置硬编码、README 与文档失真）并补齐体验短板
- 流程：每个问题一个 `feature/*` 分支 → 提交 → `git merge --no-ff` 合回 main

## 改动清单

| 分支 | 解决的问题 | 主要改动 |
|------|-----------|---------|
| feature/gitignore-cleanup | 运行时产物与本地数据库被入库 | `.gitignore` 增加 `__pycache__`、`*.pyc`、`*.sqlite3`、`backend/media/`；取消跟踪 24 个文件 |
| feature/backend-config | SECRET_KEY / DEBUG / ALLOWED_HOSTS / CORS 硬编码 | 改为环境变量读取，新增 `backend/env.example` |
| feature/backend-tests | 测试文件为空模板 | 新增 21 条测试（认证、任务 CRUD 隔离、过滤、头像校验） |
| feature/readme-cleanup | README 尾部垃圾文本与失真说明 | 删除误提交行，重写已知限制 / 测试 / 分支说明 |
| feature/api-base-env | 前端 API 地址写死 localhost | 支持 `VITE_API_BASE`，补充 `ImportMetaEnv` 类型 |
| feature/avatar-compress | 头像原图直传 | canvas 等比压缩到 256px，GIF 保留动画 |
| feature/menu-dismiss | 任务菜单点击外部不收起 | 全局 click 监听自动关闭 |
| feature/overdue-highlight | 逾期任务无提示 | 列表红色日期 + 逾期标签；日历逾期格与「已逾期」徽章 |
| feature/calendar-quick-edit | 日历只读 | 选中日「＋ 添加任务」、任务行「编辑」入口 |
| refactor/calendar-component | App.tsx 单文件过大 | 拆出 `CalendarView.tsx` 与 `calendar-utils.ts`（App.tsx 减少约 300 行） |

## 验证结果

```text
python manage.py test      → Ran 21 tests, OK
npx tsc --noEmit           → 0 errors
pnpm build                 → ✓ built, dist 产物正常
GET /src/CalendarView.tsx  → HTTP 200（Vite 编译通过）
```

## 分支与合并记录

| 分支 | 合并提交 |
|------|---------|
| feature/gitignore-cleanup | de44d1f |
| feature/backend-config | f594d32 |
| feature/backend-tests | 0662912 |
| feature/readme-cleanup | 7c19fcc |
| feature/api-base-env | 4f803b6 |
| feature/avatar-compress | ea47b9b |
| feature/menu-dismiss | 828c7ba |
| feature/overdue-highlight | 6ef4984 |
| feature/calendar-quick-edit | 43971e5 |
| refactor/calendar-component | c1644ec |
| docs/iteration-12 | 本文件所在合并提交 |

## 遗留说明

- `Token 不刷新`、`SQLite 并发`、`无前端自动化测试` 属于课程范围外的架构取舍，保留在 README 已知限制中。
- 本轮不修改 Figma Make 脚手架与 BMAD 安装目录。
