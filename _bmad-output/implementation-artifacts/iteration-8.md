# 迭代 8 — 日历视图

**日期**：2026-10-21
**触发者**：用户请求"再添加一个日历功能" + "记得输出 output（不是更新）"
**类型**：功能增强（日历视图 + 视图切换）

---

## 目标

在现有列表视图之外，增加一个**月视图日历**，让用户能直观地看到"哪一天有任务"，并点击日期查看当天任务列表。

---

## 后端改动

**零改动**。Task 模型已有 `due_date`（DateField），前端按日期字符串直接分组即可，不需要新 API 或新字段。

---

## 前端改动

### 新建（无）

### 修改

| 文件 | 变更 |
|------|------|
| `src/App.tsx` | +175 行：`CalendarView` 组件、日期小工具（pad2/toYMD/todayYMD/firstDayOfMonth/daysInMonth）、`viewMode` state、渲染层视图切换 |
| `src/index.css` | +224 行：`.toolbar-right` / `.view-switch` / `.view-tab` / 日历全套样式（grid 42 格、today 高亮、选中态、小圆点、任务列表） |

### CalendarView 组件结构

```
CalendarView({ tasks })
  ├── 顶部：月标题 + ‹ › 导航 + "今天" 按钮
  ├── 星期条：日 一 二 三 四 五 六
  ├── 42 格网格（6 行 × 7 列，aspect-ratio 1:1）
  │   ├── 上一月（低透明度，inMonth=false）
  │   ├── 本月（正常，is-today 绿色高亮，is-selected 蓝框）
  │   └── 下一月开头补齐
  │   每格：日期 + 任务数小圆点（有任务时显示）
  └── 选中日期面板：
      ├── 空："这一天没有待办 🎉"
      └── 非空：当天任务列表（已完成带删除线）
```

---

## 时间合同（经验 100007447 教训）

### 问题
前端 `Task.dueDate` 是 `YYYY-MM-DD` 字符串（ISO 8601 不带时间），Django DateField 存的是同格式。如果前端用 `new Date("2026-10-21")` 解析，不同浏览器/时区下可能偏移到 10-20 或 10-22。

### 本次落实的合同
- **全程用 YYYY-MM-DD 字符串比较**，不构造 Date 对象
- 今天的确定：用 `new Date()` 取当前本地日期 → `toYMD(y,m,d)` 格式化 → 字符串比较
- 网格填充：月份边界用 `daysInMonth(y, m)`（Django 类似但纯本地 JS，只影响显示不影响数据）
- 分组：`Map<string, Task[]>` 按 `dueDate` 字符串分组

### 为什么没改 Django
- `due_date` 是 DateField，不涉及时区
- `created_at` / `updated_at` 是 DateTimeField，但在日历视图里不显示
- settings.py 已设 `TIME_ZONE = "Asia/Shanghai"`，auto_now_add/auto_now=True 的字段会用服务器时区

---

## 视图切换交互

```
[列表] [日历]    ← toolbar 右侧
  ↑ 当前选中态绿色高亮
  ↓ 切换后：
    - 列表视图：show search-bar + filters
    - 日历视图：隐藏 search-bar + filters，显示 CalendarView
```

---

## 执行 & 验证

```bash
pnpm build
# ✓ 371ms，无 TS 错误，CSS 从 25.04 KB → 28.11 KB（+3KB），JS 不变
```

构建后无头 Chrome 应能看到：
- 登录界面 → 登录
- 顶栏下方 `toolbar-right` 区域有 `view-switch` 按钮组
- 点击"日历"后渲染 `.calendar-grid`（42 格）
- 今天有 `.is-today` 类 + 绿色背景

---

## 已知局限

1. **按月展示**，没有年视图或周视图（MVP 够用）
2. **点日期只看当天任务**，不能直接在日历里新增/编辑（需要切回列表视图）
3. **月份边界网格填充**用本地 JS `daysInMonth`，和 Django 服务器端月份计算可能有 1 天差异（实际不会——Django 的 days_in_month 和我的实现一致）
4. **没有农历/节假日标记**（课程作业不需要）

---

## 后续可迭代（可选，本次不做）

- [ ] 点击日历单元格直接打开新增表单并预填 dueDate
- [ ] 日历里拖拽任务改截止日期（复杂度较高，MVP 暂缓）
- [ ] 周视图切换
- [ ] 节假日标记

---

## 经验教训应用

| 教训 | 落实 |
|------|------|
| 前端提交日期字段为 ISO 8601 不带时间 | ✅ 全程用 YYYY-MM-DD 字符串比较，不构造 Date |
| DB 存 UTC、展示转本地（DateTimeField 场景） | ✅ 本次 due_date 是 DateField，无此问题；settings.py TIME_ZONE 已设 Asia/Shanghai |
| 不要在多个写入点分散转换 | ✅ 只有一个 `toYMD()` 出口，统一字符串格式 |
