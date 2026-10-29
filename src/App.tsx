import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AuthError,
  AuthUser,
  authApi,
  taskApi,
  Task as ApiTask,
} from "./api"

import CalendarView from "./CalendarView"
import { isOverdue } from "./calendar-utils"

type Task = ApiTask
type Filter = "all" | "active" | "completed"
type ViewMode = "list" | "calendar"

// 上传前把图片等比压缩到 max 像素内，避免原图直传占用存储
async function compressImage(file: File, max = 256): Promise<File> {
  if (file.type === "image/gif") return file // 保留动图
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= 200 * 1024) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    )
    if (!blob) return file
    const name = file.name.replace(/\.(png|jpe?g|webp)$/i, "") + ".jpg"
    return new File([blob], name, { type: "image/jpeg" })
  } catch {
    return file // 解码失败时退回原图，交给后端校验
  }
}

// 头像组件：点击打开 file input；上传中禁用；支持清除
function Avatar({
  user,
  onUpload,
  onClear,
  size = 38,
}: {
  user: AuthUser
  onUpload: (file: File) => Promise<void>
  onClear: () => Promise<void>
  size?: number
}) {
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert("图片不能超过 2MB")
      return
    }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      alert("请选择 jpg/png/webp/gif 图片")
      return
    }
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      await onUpload(compressed)
    } catch (err) {
      alert(err instanceof Error ? err.message : "上传失败")
    } finally {
      setUploading(false)
      setMenuOpen(false)
    }
  }

  const initial = user.username.charAt(0).toUpperCase()
  const img = user.avatar

  return (
    <div className="avatar-wrapper">
      <button
        aria-label="修改头像"
        className={img ? "avatar-btn has-img" : "avatar-btn"}
        onClick={() => setMenuOpen((v) => !v)}
        style={{ width: size, height: size }}
        type="button"
      >
        {uploading ? (
          <span className="avatar-loading" />
        ) : img ? (
          <img alt={`${user.username} 的头像`} src={img} />
        ) : (
          <span className="avatar-initial">{initial}</span>
        )}
      </button>
      {menuOpen && (
        <div className="avatar-menu">
          <button onClick={() => fileInputRef.current?.click()} type="button">
            {img ? "更换头像" : "上传头像"}
          </button>
          {img && (
            <button
              className="danger"
              onClick={async () => {
                setUploading(true)
                try { await onClear() } catch (err) { alert(err instanceof Error ? err.message : "清除失败") }
                finally { setUploading(false); setMenuOpen(false) }
              }}
              type="button"
            >
              清除头像
            </button>
          )}
        </div>
      )}
      <input
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />
    </div>
  )
}


function Icon({
  children,
  size = 18,
  strokeWidth = 1.8,
}: {
  children: ReactNode
  size?: number
  strokeWidth?: number
}) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {children}
    </svg>
  )
}

const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

const MoreIcon = () => (
  <Icon size={20}>
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  </Icon>
)

const CalendarIcon = () => (
  <Icon size={16}>
    <path d="M7 3v3M17 3v3M4 9h16" />
    <rect x="4" y="5" width="16" height="16" rx="2" />
  </Icon>
)

const TrashIcon = () => (
  <Icon size={17}>
    <path d="M4 7h16M9 11v6M15 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
  </Icon>
)

const EditIcon = () => (
  <Icon size={17}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
)

const SearchIcon = () => (
  <Icon size={17}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
)

const CloseIcon = () => (
  <Icon size={20}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(`${value}T00:00:00`)
  if (isNaN(date.getTime())) return value // 格式异常就原样返回
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date)
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

// 空列表时展示的示例，点击后填入新增表单，供用户参考。
function getTaskExamples() {
  return [
    { title: "整理本周工作计划", category: "工作", dueDate: addDays(2) },
    { title: "完成课程作业初稿", category: "学习", dueDate: addDays(4) },
    { title: "预约年度健康检查", category: "生活", dueDate: addDays(7) },
    { title: "阅读 30 分钟", category: "学习", dueDate: addDays(1) },
    { title: "给家里打电话", category: "生活", dueDate: addDays(0) },
    { title: "备份电脑重要文件", category: "个人", dueDate: addDays(5) },
  ]
}

function Modal({
  children,
  onClose,
  labelledBy,
  compact = false,
}: {
  children: ReactNode
  onClose: () => void
  labelledBy: string
  compact?: boolean
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`modal ${compact ? "modal-compact" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>
  )
}

export default function App() {
  // --- 认证状态 ---
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState("")
  const [loginMode, setLoginMode] = useState<"login" | "register">("login")
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")

  // --- 业务状态 ---
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 点击页面其他位置时收起任务操作菜单
  useEffect(() => {
    if (openMenuId === null) return
    const close = () => setOpenMenuId(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [openMenuId])

  // --- 启动：检查 Token → 获取用户 → 加载任务 ---
  useEffect(() => {
    const bootstrap = async () => {
      const token = authApi.getToken()
      if (!token) {
        setAuthLoading(false)
        return
      }
      try {
        const me = await authApi.me()
        setUser(me)
        await loadTasksFromServer()
      } catch (err) {
        // Token 无效 / 后端没起 → 清 Token 让用户重新登录
        authApi.clearToken()
        if (!(err instanceof AuthError)) {
          setServerError("后端连接失败，请确认 Django 服务已启动（localhost:8000）")
        }
      } finally {
        setAuthLoading(false)
      }
    }
    bootstrap()
  }, [])

  const loadTasksFromServer = useCallback(async () => {
    setTasksLoading(true)
    try {
      const list = await taskApi.list()
      setTasks(list)
    } catch (err) {
      if (err instanceof AuthError) {
        authApi.clearToken()
        setUser(null)
      } else {
        setServerError("加载任务失败")
      }
    } finally {
      setTasksLoading(false)
    }
  }, [])

  // --- 认证操作 ---
  async function handleAuthSubmit(event: FormEvent) {
    event.preventDefault()
    setAuthError("")
    if (!loginUsername.trim() || !loginPassword) {
      setAuthError("请输入用户名和密码")
      return
    }
    setLoginSubmitting(true)
    try {
      const result =
        loginMode === "login"
          ? await authApi.login(loginUsername.trim(), loginPassword)
          : await authApi.register(loginUsername.trim(), loginPassword)
      authApi.setToken(result.token)
      setUser(result.user)
      setLoginUsername("")
      setLoginPassword("")
      await loadTasksFromServer()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message.includes("HTTP 401") || err.message.includes("密码错误")
            ? "用户名或密码错误"
            : err.message.includes("HTTP 400")
              ? "用户名已存在或数据无效"
              : err.message
          : "请求失败"
      setAuthError(msg)
    } finally {
      setLoginSubmitting(false)
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // 后端挂了也要本地清掉
    }
    authApi.clearToken()
    setUser(null)
    setTasks([])
    setServerError("")
  }

  async function handleAvatarUpload(file: File) {
    const { avatar } = await authApi.uploadAvatar(file)
    setUser((u) => (u ? { ...u, avatar } : u))
  }

  async function handleAvatarClear() {
    await authApi.clearAvatar()
    setUser((u) => (u ? { ...u, avatar: "" } : u))
  }

  // --- 业务操作（全改走 API，乐观更新） ---
  const completedCount = tasks.filter((task) => task.completed).length
  const activeCount = tasks.length - completedCount

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    let result = tasks
    if (keyword) {
      result = result.filter((task) =>
        task.title.toLowerCase().includes(keyword),
      )
    }
    if (filter === "active") return result.filter((task) => !task.completed)
    if (filter === "completed") return result.filter((task) => task.completed)
    return result
  }, [filter, search, tasks])

  const isEditing = editingTask !== null
  const isModalOpen = isAddOpen || isEditing

  async function toggleTask(id: number) {
    const target = tasks.find((t) => t.id === id)
    if (!target) return
    const optimistic = !target.completed
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: optimistic } : task,
      ),
    )
    try {
      await taskApi.update(id, { completed: optimistic })
    } catch {
      // 回滚
      setTasks((current) =>
        current.map((task) =>
          task.id === id ? { ...task, completed: !optimistic } : task,
        ),
      )
      setServerError("更新失败，请重试")
    }
  }

  const [showModalExamples, setShowModalExamples] = useState(false)

  function openAddModal() {
    const firstExample = getTaskExamples()[0]
    setEditingTask(null)
    setTitle(firstExample.title)
    setCategory(firstExample.category)
    setDueDate(firstExample.dueDate)
    setErrors({})
    setShowModalExamples(false)
    setIsAddOpen(true)
  }

  function openExample(example: {
    title: string
    category: string
    dueDate: string
  }) {
    setEditingTask(null)
    setIsAddOpen(true)
    setTitle(example.title)
    setCategory(example.category)
    setDueDate(example.dueDate)
    setErrors({})
    setShowModalExamples(false)
  }

  // 从日历某一天直接新建任务：日期预填，标题留空让用户输入
  function openAddModalForDate(ymd: string) {
    setEditingTask(null)
    setTitle("")
    setCategory("")
    setDueDate(ymd)
    setErrors({})
    setShowModalExamples(false)
    setIsAddOpen(true)
  }

  function openEditModal(task: Task) {
    setIsAddOpen(false)
    setEditingTask(task)
    setTitle(task.title)
    setCategory(task.category)
    setDueDate(task.dueDate ?? "")
    setErrors({})
    setOpenMenuId(null)
  }

  function closeModal() {
    setIsAddOpen(false)
    setEditingTask(null)
    setTitle("")
    setCategory("")
    setDueDate("")
    setErrors({})
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = "请输入任务标题"
    if (!category.trim()) nextErrors.category = "请输入任务分类"
    if (!dueDate) nextErrors.dueDate = "请选择截止日期"
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    try {
      if (isEditing && editingTask) {
        const updated = await taskApi.update(editingTask.id, {
          title: title.trim(),
          category: category.trim(),
          dueDate,
        })
        setTasks((current) =>
          current.map((task) =>
            task.id === editingTask.id ? updated : task,
          ),
        )
      } else {
        const created = await taskApi.create({
          title: title.trim(),
          category: category.trim(),
          dueDate,
          completed: false,
        })
        setTasks((current) => [created, ...current])
        setFilter("all")
      }
      closeModal()
    } catch {
      setServerError("保存失败，请重试")
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await taskApi.remove(deleteTarget.id)
      setTasks((current) => current.filter((task) => task.id !== deleteTarget.id))
    } catch {
      setServerError("删除失败，请重试")
    } finally {
      setDeleteTarget(null)
    }
  }

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "全部", count: tasks.length },
    { id: "active", label: "待完成", count: activeCount },
    { id: "completed", label: "已完成", count: completedCount },
  ]

  return (
    <div className="app-shell">
      {/* --- 未登录：登录/注册界面 --- */}
      {authLoading ? (
        <div className="auth-wrap">
          <p className="loading-text">加载中…</p>
        </div>
      ) : !user ? (
        <div className="auth-wrap">
          <div className="auth-card">
            <div className="auth-brand">
              <span className="brand-mark">
                <Icon size={22} strokeWidth={2.2}>
                  <path d="M6.5 12.5l3.2 3.2L18 7.5" />
                </Icon>
              </span>
              <h1 className="auth-title">QuickTasks</h1>
              <p className="auth-subtitle">用最少的操作，记录每天的待办</p>
            </div>

            <div className="auth-tabs">
              <button
                aria-selected={loginMode === "login"}
                className={loginMode === "login" ? "auth-tab active" : "auth-tab"}
                onClick={() => { setLoginMode("login"); setAuthError("") }}
                type="button"
              >
                登录
              </button>
              <button
                aria-selected={loginMode === "register"}
                className={loginMode === "register" ? "auth-tab active" : "auth-tab"}
                onClick={() => { setLoginMode("register"); setAuthError("") }}
                type="button"
              >
                注册
              </button>
            </div>

            <form className="auth-form" noValidate onSubmit={handleAuthSubmit}>
              <div className="form-field">
                <label htmlFor="auth-username">用户名</label>
                <input
                  autoComplete="username"
                  id="auth-username"
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin"
                  type="text"
                  value={loginUsername}
                />
              </div>
              <div className="form-field">
                <label htmlFor="auth-password">密码</label>
                <input
                  autoComplete={loginMode === "login" ? "current-password" : "new-password"}
                  id="auth-password"
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="admin123"
                  type="password"
                  value={loginPassword}
                />
              </div>
              {authError && <p className="auth-error">{authError}</p>}
              <button className="primary-button auth-submit" disabled={loginSubmitting} type="submit">
                {loginSubmitting ? "处理中…" : loginMode === "login" ? "登录" : "创建账号"}
              </button>
              {serverError && (
                <p className="auth-hint">
                  ⚠ {serverError}
                </p>
              )}
              <p className="auth-hint">
                Demo 账号：<code>admin / admin123</code>
              </p>
            </form>
          </div>
        </div>
      ) : (
        <>
      {/* --- 已登录：主界面 --- */}
      {serverError && (
        <div className="server-error-bar" role="alert">
          {serverError}
          <button onClick={() => setServerError("")} className="error-close" type="button">
            <CloseIcon />
          </button>
        </div>
      )}

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">
              <Icon size={20} strokeWidth={2.2}>
                <path d="M6.5 12.5l3.2 3.2L18 7.5" />
              </Icon>
            </span>
            <span className="brand-name">QuickTasks</span>
          </div>
          <div className="user-area">
            <Avatar onClear={handleAvatarClear} onUpload={handleAvatarUpload} user={user!} />
            <span className="user-greeting">你好，{user.username}</span>
            <button aria-label="退出登录" className="logout-button" onClick={handleLogout} type="button">
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">我的任务</p>
            <h1>今天也向前一步</h1>
            <p className="welcome-copy">
              从一件小事开始，让今天更专注、更有条理。
            </p>
          </div>
          <button
            className="primary-button desktop-add"
            onClick={openAddModal}
            type="button"
          >
            <PlusIcon />
            添加任务
          </button>
        </section>

        <section aria-label="任务统计" className="stats">
          <div className="stat-item">
            <span className="stat-number">{tasks.length}</span>
            <span className="stat-label">全部任务</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">{activeCount}</span>
            <span className="stat-label">
              <span className="status-dot active" />
              待完成
            </span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number muted">{completedCount}</span>
            <span className="stat-label">
              <span className="status-dot done" />
              已完成
            </span>
          </div>
        </section>

        <section className="task-section">
          <div className="task-toolbar">
            <h2>任务列表</h2>
            <div className="toolbar-right">
              <div className="view-switch" role="tablist" aria-label="视图切换">
                <button
                  aria-selected={viewMode === "list"}
                  className={viewMode === "list" ? "view-tab active" : "view-tab"}
                  onClick={() => setViewMode("list")}
                  role="tab"
                  type="button"
                >
                  列表
                </button>
                <button
                  aria-selected={viewMode === "calendar"}
                  className={viewMode === "calendar" ? "view-tab active" : "view-tab"}
                  onClick={() => setViewMode("calendar")}
                  role="tab"
                  type="button"
                >
                  日历
                </button>
              </div>
              {viewMode === "list" && (
                <div aria-label="筛选任务" className="filters" role="tablist">
                  {filters.map((item) => (
                    <button
                      aria-selected={filter === item.id}
                      className={filter === item.id ? "filter active" : "filter"}
                      key={item.id}
                      onClick={() => setFilter(item.id)}
                      role="tab"
                      type="button"
                    >
                      {item.label}
                      <span>{item.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {viewMode === "calendar" ? (
            <CalendarView
              onAddTask={openAddModalForDate}
              onEditTask={openEditModal}
              tasks={tasks}
            />
          ) : (
            <>
          <div className="search-bar">
            <SearchIcon />
            <input
              aria-label="搜索任务"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索任务标题…"
              type="search"
              value={search}
            />
            {search && (
              <button
                aria-label="清除搜索"
                className="search-clear"
                onClick={() => setSearch("")}
                type="button"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          <div className="task-list">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <article
                  className={`task-row ${task.completed ? "completed" : ""} ${isOverdue(task) ? "overdue" : ""}`}
                  key={task.id}
                >
                  <button
                    aria-label={
                      task.completed
                        ? `标记 ${task.title} 为待完成`
                        : `完成 ${task.title}`
                    }
                    className="check-button"
                    onClick={() => toggleTask(task.id)}
                    type="button"
                  >
                    {task.completed && (
                      <Icon size={14} strokeWidth={2.4}>
                        <path d="M5 12l4 4 10-10" />
                      </Icon>
                    )}
                  </button>
                  <div className="task-body">
                    <p className="task-title">{task.title}</p>
                    <div className="task-meta">
                      <span className="category">{task.category}</span>
                      <span className={isOverdue(task) ? "date overdue" : "date"}>
                        <CalendarIcon />
                        {formatDate(task.dueDate)}
                        {isOverdue(task) && <em className="overdue-tag">逾期</em>}
                      </span>
                    </div>
                  </div>
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
                    <button
                      aria-expanded={openMenuId === task.id}
                      aria-label={`${task.title} 的更多操作`}
                      className="more-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setOpenMenuId((current) =>
                          current === task.id ? null : task.id,
                        )
                      }}
                      type="button"
                    >
                      <MoreIcon />
                    </button>
                    {openMenuId === task.id && (
                      <div
                        className="action-menu"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          onClick={() => openEditModal(task)}
                          type="button"
                        >
                          <EditIcon />
                          编辑任务
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(task)
                            setOpenMenuId(null)
                          }}
                          type="button"
                        >
                          <TrashIcon />
                          删除任务
                        </button>
                      </div>
                    )}
                  </div>
                  )}
                </article>
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Icon size={25}>
                    <path d="M7 3h10v4H7zM5 5H3v16h18V5h-2M8 13l2.5 2.5L16 10" />
                  </Icon>
                </span>
                <h3>
                  {search
                    ? "没有匹配的任务"
                    : filter === "active"
                      ? "没有待完成的任务"
                      : filter === "completed"
                        ? "还没有已完成的任务"
                        : "任务清单还是空的"}
                </h3>
                <p>
                  {search
                    ? "试试其他关键词，或清除搜索条件。"
                    : filter === "active"
                      ? "做得很好，今天的任务已经全部完成。"
                      : "添加一个任务，迈出今天的第一步。"}
                </p>
                {!search && filter !== "active" && (
                  <button
                    className="secondary-button"
                    onClick={openAddModal}
                    type="button"
                  >
                    <PlusIcon />
                    添加任务
                  </button>
                )}
                {!search && filter === "all" && tasks.length === 0 && (
                  <div className="example-block">
                    <p className="example-heading">
                      以下是示例任务，点击可填入表单作为参考
                    </p>
                    <ul className="example-list">
                      {getTaskExamples().map((example) => (
                        <li key={example.title}>
                          <button
                            className="example-item"
                            onClick={() => openExample(example)}
                            type="button"
                          >
                            <span className="example-title">
                              {example.title}
                            </span>
                            <span className="example-meta">
                              {example.category} · {formatDate(example.dueDate)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
            </>
          )}
        </section>

        <button
          aria-label="添加任务"
          className="mobile-add"
          onClick={openAddModal}
          type="button"
        >
          <PlusIcon />
        </button>
      </main>

      {isModalOpen && (
        <Modal labelledBy="task-modal-title" onClose={closeModal}>
          <div className="modal-header">
            <div>
              <p className="modal-kicker">{isEditing ? "修改任务" : "新任务"}</p>
              <h2 id="task-modal-title">
                {isEditing ? "编辑任务" : "添加任务"}
              </h2>
            </div>
            <button
              aria-label="关闭"
              className="close-button"
              onClick={closeModal}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
          <form noValidate onSubmit={handleSubmit}>
            {!isEditing && (
              <div className="modal-examples">
                <button
                  aria-expanded={showModalExamples}
                  aria-controls="modal-examples-panel"
                  className="modal-examples-toggle"
                  onClick={() => setShowModalExamples((v) => !v)}
                  type="button"
                >
                  <span>试试其他示例任务</span>
                  <span className="chevron" aria-hidden="true">
                    {showModalExamples ? "▲" : "▼"}
                  </span>
                </button>
                {showModalExamples && (
                  <div
                    className="modal-examples-panel"
                    id="modal-examples-panel"
                  >
                    {getTaskExamples().map((example) => (
                      <button
                        className="modal-example-chip"
                        key={example.title}
                        onClick={() => openExample(example)}
                        type="button"
                      >
                        {example.title}
                        <span className="modal-example-chip-meta">
                          {example.category} ·{" "}
                          {formatDate(example.dueDate)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="form-field">
              <label htmlFor="task-title">任务标题</label>
              <input
                aria-describedby={errors.title ? "title-error" : undefined}
                aria-invalid={Boolean(errors.title)}
                autoFocus
                id="task-title"
                onChange={(event) => {
                  setTitle(event.target.value)
                  if (errors.title)
                    setErrors((current) => ({ ...current, title: "" }))
                }}
                placeholder="例如：整理本周工作计划"
                value={title}
              />
              {errors.title && (
                <span className="field-error" id="title-error">
                  {errors.title}
                </span>
              )}
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="task-category">分类</label>
                <input
                  aria-describedby={
                    errors.category ? "category-error" : undefined
                  }
                  aria-invalid={Boolean(errors.category)}
                  id="task-category"
                  onChange={(event) => {
                    setCategory(event.target.value)
                    if (errors.category)
                      setErrors((current) => ({ ...current, category: "" }))
                  }}
                  placeholder="工作、生活或学习"
                  value={category}
                />
                {errors.category && (
                  <span className="field-error" id="category-error">
                    {errors.category}
                  </span>
                )}
              </div>
              <div className="form-field">
                <label htmlFor="task-date">截止日期</label>
                <input
                  aria-describedby={errors.dueDate ? "date-error" : undefined}
                  aria-invalid={Boolean(errors.dueDate)}
                  id="task-date"
                  onChange={(event) => {
                    setDueDate(event.target.value)
                    if (errors.dueDate)
                      setErrors((current) => ({ ...current, dueDate: "" }))
                  }}
                  type="date"
                  value={dueDate}
                />
                {errors.dueDate && (
                  <span className="field-error" id="date-error">
                    {errors.dueDate}
                  </span>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={closeModal}
                type="button"
              >
                取消
              </button>
              <button className="primary-button" type="submit">
                {isEditing ? "保存修改" : "添加任务"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          compact
          labelledBy="delete-task-title"
          onClose={() => setDeleteTarget(null)}
        >
          <div className="delete-icon">
            <TrashIcon />
          </div>
          <h2 id="delete-task-title">删除这个任务？</h2>
          <p className="delete-copy">
            “{deleteTarget.title}”将从任务列表中移除，此操作无法撤销。
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDeleteTarget(null)}
              type="button"
            >
              取消
            </button>
            <button
              className="danger-button"
              onClick={confirmDelete}
              type="button"
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
        </>
      )}
    </div>
  )
}
