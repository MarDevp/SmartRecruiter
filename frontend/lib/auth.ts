export interface User {
  id: string
  username: string
  email: string
}

export interface AuthResponse {
  message: string
  access_token: string
  user: User
}

export interface SignupData {
  username: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

// Token management utilities
export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("auth_token")
  },

  set: (token: string): void => {
    if (typeof window === "undefined") return
    localStorage.setItem("auth_token", token)
  },

  remove: (): void => {
    if (typeof window === "undefined") return
    localStorage.removeItem("auth_token")
  },
}

// Check if token is expired (basic JWT parsing)
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

// Get API base URL
export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
}
