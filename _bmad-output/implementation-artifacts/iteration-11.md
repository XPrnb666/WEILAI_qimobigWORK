# 迭代 11 — 已完成任务条快捷删除

**日期**：2026-10-22
**触发者**：用户请求"已经确认完成的数据条可以自己删除"
**类型**：前端交互增强（UI 变化 + 后端 API 零改动）

---

## 改动文件

| 文件 | 改动行数 | 内容 |
|------|----------|------|
| `src/App.tsx` | +30 | 任务条渲染：已完成的条直接渲染 `<button class="quick-delete-button">` + `<TrashIcon>`；未完成的条保持三点菜单 |
| `src/index.css` | +33 | `.quick-delete-button` 全套样式（28×28 圆形小按钮、hover 变红、与 `.task-row.completed` 联动）|

**后端零改动**——已有 `taskApi.remove(id)` → `DELETE /api/tasks/{id}/`。

---

## 交互对比

```
迭代 10 之前：
  所有任务条 → 点三点 → 弹 action-menu → 点"删除任务" → 确认 Modal → 删除
  （4 步操作）

迭代 11 之后：
  已完成任务条 → 直接点右侧红色垃圾桶 → 确认 Modal → 删除
  （2 步操作，省掉进三点菜单）

  未完成任务条 → 保持三点菜单 → 删除任务 → 确认 Modal（不变）
```

---

## 关键代码（App.tsx L900-L952）

```tsx
{/* 已完成的条：直接露出删除按钮（快捷删除） */}
{task.completed ? (
  <button
    aria-label={`删除已完成任务 ${task.title}`}
    className="quick-delete-button"
    onClick={() => setDeleteTarget(task)}
    type="button"
    title="删除此已完成的任务"
  >
    <TrashIcon />
  </button>
) : (
  <div className="menu-wrap">
    {/* 未完成的保持三点菜单（编辑 + 删除） */}
    ...
  </div>
)}
```

已完成条**完全不再渲染** `.menu-wrap` + 三点按钮——省 DOM，视觉更干净。

---

## CSS 关键

```css
.quick-delete-button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-faint);
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}

.quick-delete-button:hover {
  background: var(--danger-soft);   /* 淡红色背景 */
  color: var(--danger);              /* 图标变红 */
}

.task-row.completed .quick-delete-button:hover {
  /* 已完成条本身视觉弱化，hover 红色更突出 */
}
```

设计选择：默认灰（ink-faint）+ hover 变红——避免已完成条视觉混乱，又保持可发现性。和三点按钮（28px）同宽，flex 布局自动对齐。

---

## 构建验证

```bash
pnpm build
# ✓ 263ms
# CSS: 29.47 KB → 29.95 KB（+0.48 KB）
# JS: 214.76 KB（没变）
# TS 严格模式 ✅ 0 错误
```

无头 Chrome dump-dom 确认：`quick-delete-button` 类名存在 ✅

---

## 已知局限

1. **快捷删除仍走确认 Modal**（和三点菜单里的删除一样）——用户不能绕过确认直接删。课程作业阶段可接受；真做下去要加"按住 Shift 删除"绕过确认或"自动清理已完成"。
2. **未完成任务仍需三点菜单删除**——如果用户想让未完成也露快捷删除，只需把 `task.completed ? ... : ...` 改成始终渲染 quick-delete-button（三点菜单里的删除可删）。
3. **"已完成"的快捷删除只出现在列表视图**——日历视图 `CalendarView` 组件里没传 delete 逻辑（日历视图只读）。

---

## 本次独立输出

- `_bmad-output/implementation-artifacts/iteration-11.md`（本文件）
