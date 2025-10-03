"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  type AuthResponse,
  type SignupData,
  type LoginData,
  tokenStorage,
  isTokenExpired,
  getApiBaseUrl,
} from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginData) => Promise<boolean>
  signup: (data: SignupData) => Promise<boolean>
  logout: () => void
  getAuthHeaders: () => Record<string, string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const isAuthenticated = !!user

  // Get authorization headers for API calls
  const getAuthHeaders = (): Record<string, string> => {
    const token = tokenStorage.get()
    if (!token) return {}

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

  // Load user from token on app start
  useEffect(() => {
    const loadUser = async () => {
      const token = tokenStorage.get()

      if (!token || isTokenExpired(token)) {
        tokenStorage.remove()
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
          headers: getAuthHeaders(),
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          tokenStorage.remove()
        }
      } catch (error) {
        console.error("Failed to load user:", error)
        tokenStorage.remove()
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (data: LoginData): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const authData: AuthResponse = await response.json()
        tokenStorage.set(authData.access_token)
        setUser(authData.user)
        toast({
          title: "Login successful",
          description: "Welcome back!",
        })
        return true
      } else {
        const error = await response.json()
        toast({
          title: "Login failed",
          description: error.error || "Invalid credentials",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const signup = async (data: SignupData): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({
          title: "Account created",
          description: "Please sign in with your new account",
        })
        return true
      } else {
        const error = await response.json()
        toast({
          title: "Signup failed",
          description: error.error || "Failed to create account",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const logout = async () => {
    try {
      const token = tokenStorage.get()
      if (token) {
        await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
          method: "POST",
          headers: getAuthHeaders(),
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      tokenStorage.remove()
      setUser(null)
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        signup,
        logout,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
