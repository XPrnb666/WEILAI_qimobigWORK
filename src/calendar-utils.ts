// 日历相关的日期与配色工具函数
import type { Task } from "./api"

// 补齐两位：2026-1-5 → 2026-01-05
function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n
}

export function toYMD(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`
}
export function todayYMD(): string {
  const now = new Date()
  return toYMD(now.getFullYear(), now.getMonth(), now.getDate())
}
export function firstDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 1).getDay() // 0=周日
}
export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate()
}

// 分类配色：按分类名稳定映射到柔和色板，保证同一分类在日历条与详情里颜色一致
export const CATEGORY_PALETTE = [
  { bg: "#e7f0eb", ink: "#2f6a4e" },
  { bg: "#e6eef9", ink: "#2f5b8a" },
  { bg: "#f9efdf", ink: "#8a5a2b" },
  { bg: "#f0eaf8", ink: "#6a4a8a" },
  { bg: "#fbe9e9", ink: "#8a3a3a" },
  { bg: "#eef2e4", ink: "#4f6a2b" },
]

export function categoryTone(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 104729
  }
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length]
}

// 每个格子最多展示 3 条任务条，其余折叠成 +N
export const CHIP_LIMIT = 3
export const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

export function weekdayLabel(ymd: string) {
  const date = new Date(`${ymd}T00:00:00`)
  return Number.isNaN(date.getTime()) ? "" : WEEKDAY_LABELS[date.getDay()]
}

// 未完成且截止日期早于今天 → 逾期
export function isOverdue(task: Task) {
  if (task.completed || !task.dueDate) return false
  return task.dueDate < todayYMD()
}
