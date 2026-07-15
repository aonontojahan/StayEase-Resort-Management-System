import React, { createContext, useContext, useState, useEffect } from "react"
import { User, TokenResponse, LoginRequest, UserCreate } from "@/types/auth"
import { api } from "@/services/api"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (userIn: UserCreate) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleLogoutState = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    setUser(null)
  }

  // Load auth state from localStorage on init
  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    const accessToken = localStorage.getItem("accessToken")

    if (savedUser && accessToken) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        handleLogoutState()
      }
    }
    setIsLoading(false)

    // Listen for logout events dispatched from api.ts (e.g. on refresh fail)
    const handleAuthLogoutEvent = () => {
      handleLogoutState()
    }
    window.addEventListener("auth-logout", handleAuthLogoutEvent)

    return () => {
      window.removeEventListener("auth-logout", handleAuthLogoutEvent)
    }
  }, [])

  const login = async (credentials: LoginRequest) => {
    const response = await api.post<TokenResponse>("/auth/login", credentials)
    const { access_token, refresh_token, user: loggedUser } = response.data

    localStorage.setItem("accessToken", access_token)
    localStorage.setItem("refreshToken", refresh_token)
    localStorage.setItem("user", JSON.stringify(loggedUser))

    setUser(loggedUser)
  }

  const register = async (userIn: UserCreate) => {
    const response = await api.post<TokenResponse>("/auth/register", userIn)
    const { access_token, refresh_token, user: registeredUser } = response.data

    localStorage.setItem("accessToken", access_token)
    localStorage.setItem("refreshToken", refresh_token)
    localStorage.setItem("user", JSON.stringify(registeredUser))

    setUser(registeredUser)
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      const refreshToken = localStorage.getItem("refreshToken")
      const accessToken = localStorage.getItem("accessToken")
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken, access_token: accessToken })
      }
    } catch {
      // Proceed with local logout even if API call fails
    } finally {
      handleLogoutState()
      setIsLoading(false)
    }
  }

  const updateUser = (updatedUser: User) => {
    localStorage.setItem("user", JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
