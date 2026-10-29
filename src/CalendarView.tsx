import { useMemo, useState } from "react"
import type { Task } from "./api"
import {
  CHIP_LIMIT,
  categoryTone,
  daysInMonth,
  firstDayOfMonth,
  isOverdue,
  toYMD,
  todayYMD,
  weekdayLabel,
} from "./calendar-utils"

// 日历视图：月网格、月度概览与选中日任务列表
export default function CalendarView({
  tasks,
  onAddTask,
  onEditTask,
}: {
  tasks: Task[]
  onAddTask?: (ymd: string) => void
  onEditTask?: (task: Task) => void
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-11
  const [selectedYMD, setSelectedYMD] = useState<string>(todayYMD())

  const firstDay = firstDayOfMonth(year, month)
  const totalDays = daysInMonth(year, month)
  const prevMonthDays = daysInMonth(year, month - 1)

  // 构建 42 格（6 行 × 7 列）网格，每格是 YYYY-MM-DD 字符串
  const grid: { ymd: string; inMonth: boolean; day: number }[] = []
  // 上一月尾部
  for (let i = firstDay - 1; i >= 0; i--) {
    const prevM = month - 1
    const prevY = prevM < 0 ? year - 1 : year
    const realM = prevM < 0 ? 11 : prevM
    grid.push({
      ymd: toYMD(prevY, realM, prevMonthDays - i),
      inMonth: false,
      day: prevMonthDays - i,
    })
  }
  // 本月
  for (let d = 1; d <= totalDays; d++) {
    grid.push({ ymd: toYMD(year, month, d), inMonth: true, day: d })
  }
  // 下一月开头补到 42 格
  while (grid.length < 42) {
    const nextM = month + 1
    const nextY = nextM > 11 ? year + 1 : year
    const realM = nextM > 11 ? 0 : nextM
    const nextDay = grid.length - (firstDay + totalDays) + 1
    grid.push({ ymd: toYMD(nextY, realM, nextDay), inMonth: false, day: nextDay })
  }

  // 按 due_date（字符串）分组
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.dueDate) continue
      const list = map.get(t.dueDate) ?? []
      list.push(t)
      map.set(t.dueDate, list)
    }
    return map
  }, [tasks])

  const navMonth = (delta: number) => {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  const goToday = () => {
    const n = new Date()
    setYear(n.getFullYear()); setMonth(n.getMonth()); setSelectedYMD(todayYMD())
  }

  const monthLabel = `${year} 年 ${month + 1} 月`
  const selectedTasks = tasksByDate.get(selectedYMD) ?? []
  const today = todayYMD()

  // 本月概览：总任务 / 已完成 / 完成率 / 有安排的天数
  let monthTotal = 0
  let monthDone = 0
  let monthActiveDays = 0
  for (const cell of grid) {
    if (!cell.inMonth) continue
    const dayTasks = tasksByDate.get(cell.ymd) ?? []
    if (dayTasks.length > 0) monthActiveDays += 1
    monthTotal += dayTasks.length
    monthDone += dayTasks.filter((t) => t.completed).length
  }
  const monthRate = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button aria-label="上一月" className="calendar-nav-btn" onClick={() => navMonth(-1)} type="button">‹</button>
          <h2 className="calendar-title">{monthLabel}</h2>
          <button aria-label="下一月" className="calendar-nav-btn" onClick={() => navMonth(1)} type="button">›</button>
          <button aria-label="回到今天" className="calendar-today-btn" onClick={goToday} type="button">今天</button>
        </div>
        <div aria-label="本月任务概览" className="calendar-summary">
          <div className="calendar-summary-item">
            <strong>{monthTotal}</strong>
            <span>本月任务</span>
          </div>
          <div className="calendar-summary-item">
            <strong>{monthDone}</strong>
            <span>已完成</span>
          </div>
          <div className="calendar-summary-item">
            <strong>{monthRate}%</strong>
            <span>完成率</span>
          </div>
          <div className="calendar-summary-item">
            <strong>{monthActiveDays}</strong>
            <span>有安排天数</span>
          </div>
        </div>
      </div>
      <div
        aria-label={`本月完成率 ${monthRate}%`}
        className="calendar-progress"
        role="progressbar"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={monthRate}
      >
        <span className="calendar-progress-fill" style={{ width: `${monthRate}%` }} />
      </div>
      <div className="calendar-weekdays">
        {["日","一","二","三","四","五","六"].map((w) => (
          <div key={w} className="calendar-weekday">{w}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {grid.map((cell) => {
          const dayTasks = tasksByDate.get(cell.ymd) ?? []
          const isToday = cell.ymd === today
          const isSelected = cell.ymd === selectedYMD
          const allDone =
            dayTasks.length > 0 && dayTasks.every((t) => t.completed)
          const hasOverdue =
            cell.ymd < today && dayTasks.some((t) => !t.completed)
          const cls = [
            "calendar-cell",
            cell.inMonth ? "in-month" : "out-month",
            isToday ? "is-today" : "",
            isSelected ? "is-selected" : "",
            allDone ? "is-done-day" : "",
            hasOverdue ? "has-overdue" : "",
          ].filter(Boolean).join(" ")
          return (
            <button
              className={cls}
              key={cell.ymd}
              onClick={() => setSelectedYMD(cell.ymd)}
              title={`${cell.ymd} · ${dayTasks.length} 个任务`}
              type="button"
            >
              <span className="calendar-cell-head">
                <span className="calendar-cell-day">{cell.day}</span>
                {dayTasks.length > 0 && (
                  <span className="calendar-cell-count">{dayTasks.length}</span>
                )}
              </span>
              <span className="calendar-cell-chips">
                {dayTasks.slice(0, CHIP_LIMIT).map((t) => {
                  const tone = categoryTone(t.category)
                  return (
                    <span
                      className={t.completed ? "calendar-chip done" : "calendar-chip"}
                      key={t.id}
                      style={{ background: tone.bg, color: tone.ink }}
                    >
                      {t.title}
                    </span>
                  )
                })}
                {dayTasks.length > CHIP_LIMIT && (
                  <span className="calendar-chip-more">
                    +{dayTasks.length - CHIP_LIMIT}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <div className="calendar-selected-section">
        <div className="calendar-selected-head">
          <h3 className="calendar-selected-title">
            {selectedYMD}（{weekdayLabel(selectedYMD)}）的任务
            {selectedTasks.length > 0 && (
              <span className="calendar-selected-count">
                {selectedTasks.filter((t) => t.completed).length} / {selectedTasks.length} 已完成
              </span>
            )}
          </h3>
          {onAddTask && (
            <button
              className="calendar-add-btn"
              onClick={() => onAddTask(selectedYMD)}
              type="button"
            >
              ＋ 添加任务
            </button>
          )}
        </div>
        {selectedTasks.length === 0 ? (
          <p className="calendar-empty">这一天没有待办</p>
        ) : (
          <ul className="calendar-task-list">
            {selectedTasks.map((t) => {
              const tone = categoryTone(t.category)
              return (
                <li key={t.id} className={t.completed ? "calendar-task done" : "calendar-task"}>
                  <span className="calendar-task-dot" style={{ background: tone.ink }} />
                  <span className="calendar-task-title">{t.title}</span>
                  <span className="calendar-task-cat" style={{ background: tone.bg, color: tone.ink }}>
                    {t.category}
                  </span>
                  {onEditTask && (
                    <button
                      className="calendar-task-edit"
                      onClick={() => onEditTask(t)}
                      type="button"
                    >
                      编辑
                    </button>
                  )}
                  <span
                    className={
                      t.completed
                        ? "calendar-task-badge done"
                        : isOverdue(t)
                          ? "calendar-task-badge overdue"
                          : "calendar-task-badge"
                    }
                  >
                    {t.completed ? "已完成" : isOverdue(t) ? "已逾期" : "待完成"}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
