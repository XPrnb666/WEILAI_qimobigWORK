// Django 后端 API 封装
// 所有请求自动带上 Token 头；401 时抛 AuthError 让上层处理登录跳转

// 默认指向本地 Django；部署或多环境时用 VITE_API_BASE 覆盖
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api"
const TOKEN_KEY = "quicktask.token"

export class AuthError extends Error {
  constructor(message = "需要登录") {
    super(message)
    this.name = "AuthError"
  }
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function authHeaders(): Record<string, string> {
  const t = getToken()
  if (!t) return {}
  return { Authorization: `Token ${t}` }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...((options.headers as Record<string, string>) || {}),
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    clearToken()
    throw new AuthError()
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  // 204 No Content 等情况返回 null
  if (res.status === 204) return null as T
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (null as T)
}

// 认证接口
export type AuthUser = { id: number; username: string; avatar: string }
export type AuthResult = { token: string; user: AuthUser }

export const authApi = {
  login: (username: string, password: string) =>
    request<AuthResult>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string) =>
    request<AuthResult>("/auth/register/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<void>("/auth/logout/", { method: "POST" }),
  me: () => request<AuthUser>("/auth/me/", { method: "GET" }),
  setToken,
  clearToken,
  getToken,
  /** 上传头像（FormData）——返回新的 avatar URL */
  uploadAvatar: async (file: File): Promise<{ avatar: string }> => {
    const t = getToken()
    if (!t) throw new AuthError()
    const fd = new FormData()
    fd.append("avatar", file)
    const res = await fetch(`${API_BASE}/users/avatar/`, {
      method: "POST",
      headers: { Authorization: `Token ${t}` },
      body: fd,
    })
    if (res.status === 401) {
      clearToken()
      throw new AuthError()
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    return res.json()
  },
  /** 清除头像 */
  clearAvatar: async (): Promise<void> => {
    const t = getToken()
    if (!t) throw new AuthError()
    const res = await fetch(`${API_BASE}/users/avatar/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${t}` },
    })
    if (res.status === 401) { clearToken(); throw new AuthError() }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  },
}

// Task 接口
export type Task = {
  id: number
  title: string
  category: string
  dueDate: string | null
  completed: boolean
  owner: { id: number; username: string }
  created_at: string
  updated_at: string
}

export type TaskInput = {
  title: string
  category?: string
  dueDate?: string | null
  completed?: boolean
}

export const taskApi = {
  list: () => request<Task[]>("/tasks/"),
  create: (data: TaskInput) =>
    request<Task>("/tasks/", {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        category: data.category ?? "通用",
        dueDate: data.dueDate ?? null,
        completed: data.completed ?? false,
      }),
    }),
  update: (id: number, data: Partial<TaskInput>) =>
    request<Task>(`/tasks/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) => request<void>(`/tasks/${id}/`, { method: "DELETE" }),
}
