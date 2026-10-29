# QuickTask — 项目级工作流规则

> 本文件分为两部分：**QuickTask 项目 BMAD 工作流规则**（优先）和下方 **Figma Make 脚手架技术说明**（保留）。AI 执行任务时优先遵循本文件前半部分的 BMAD 规则。

---

## QuickTask — BMAD 工作流规则

### 项目目标

QuickTask 是一个 To-Do 待办事项**课程大作业**。项目必须通过 BMAD-Method 完成**需求分析、规划设计、开发实现、验证改进**四个阶段，并在 Git 仓库中保留**真实、可追溯**的开发证据。

### BMAD 使用规则

- 优先使用 `.trae/skills/` 中已经安装的 BMAD Skills（v6.12.4）。
- 执行前读取对应 `SKILL.md`，遵循真实工作流，不虚构 Skill 名称或输出。
- **不修改 `_bmad/` 安装目录**。
- 所有阶段产物必须保存到仓库，并纳入 Git 版本管理。

### 统一输出目录（每一次迭代必须写入）

> 任何迭代的产出（简报、PRD、架构、构建记录、测试报告、修复记录、设计草稿、验证笔记等）**全部**写入以下目录之一，不得散落在根目录或其他位置。

| 产物类型 | 目录 |
|----------|------|
| 需求 / 规划产物 | `_bmad-output/planning-artifacts/` |
| 实现 / 验证产物 | `_bmad-output/implementation-artifacts/` |

建议文件名：

- `planning-artifacts/`：`product-brief.md`、`prd.md`、`architecture.md`、`epics-and-stories.md`
- `implementation-artifacts/`：`build-report.md`、`test-report.md`、`code-review.md`、`iteration-notes.md`

每次迭代结束前，将本阶段所有文字产出归档到对应目录；根目录只保留 README、配置文件和源码。

### 阶段一：需求分析

- 使用实际可用的产品简报或需求分析 Skill（如 `bmad-product-brief`、`bmad-prd`）。
- 输出产品简报、用户场景、功能需求和验收标准。
- 保存至 `_bmad-output/planning-artifacts/`。
- 完成后创建独立 Git 提交。

### 阶段二：规划与设计

- 使用实际可用的 PRD、SPEC、架构或任务拆分 Skill（如 `bmad-prd`、`bmad-spec`、`bmad-architecture`、`bmad-create-epics-and-stories`）。
- 输出精简需求规格、技术架构和开发任务清单。
- 每个任务应有编号、功能描述及验收条件。
- 完成后创建独立 Git 提交。

### 阶段三：开发实现

- 根据任务清单开发 QuickTask。
- 复用已有 Figma 设计及代码，不随意重构。
- 按功能模块分别提交代码。
- 执行真实 Build 命令（`pnpm build`），并将构建记录（命令、输出、错误）写入 `_bmad-output/implementation-artifacts/build-report.md`。
- 不得伪造构建成功结果。

### 阶段四：验证与改进

- 使用实际可用的 BMAD Code Review、Walkthrough 或 QA Skill（如 `bmad-code-review`、`bmad-walkthrough`、`bmad-qa-generate-e2e-tests`）。
- 检查代码是否实现 PRD / SPEC 中的功能。
- 将真实测试结果、问题记录写入 `_bmad-output/implementation-artifacts/test-report.md` 或 `iteration-notes.md`。
- 验证记录与修复代码**分别提交**。

### Git 证据要求

提交记录必须能体现：

```
需求 → 规划 → 实现 → 验证 → 改进
```

- 不得伪造历史提交、修改提交时间或一次性提交全部阶段产物。
- 检查 `.gitignore`，确保 BMAD 工作流产物、规划文件和验证记录不会被意外忽略。

### 执行效率要求

- 以完成课程大作业为目标，不进行不必要的商业级扩展。
- 尽量减少反复确认。
- 每次优先完成一个可验证的工作阶段。
- **不删除已有代码或覆盖重要文件**。
- 重要或破坏性操作必须先询问。

---

## figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
