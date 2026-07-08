import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { TokenResponse } from "@/types/auth"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Attach access token to every outgoing request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem("accessToken")
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Intercept 401 responses to try token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config
    if (!originalRequest) return Promise.reject(error)

    // Check if error is 401 and we haven't retried yet
    const isUnauthorized = error.response?.status === 401
    const isRefreshCall = originalRequest.url?.includes("/auth/refresh")

    if (isUnauthorized && !isRefreshCall) {
      if (isRefreshing) {
        // Queue failed requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      isRefreshing = true
      const refreshToken = localStorage.getItem("refreshToken")

      if (!refreshToken) {
        isRefreshing = false
        // No refresh token available, clear storage and log out
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        window.dispatchEvent(new Event("auth-logout"))
        return Promise.reject(error)
      }

      try {
        // Request token refresh
        const response = await axios.post<TokenResponse>(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        )

        const { access_token, refresh_token: new_refresh, user } = response.data

        localStorage.setItem("accessToken", access_token)
        localStorage.setItem("refreshToken", new_refresh)
        localStorage.setItem("user", JSON.stringify(user))

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }

        processQueue(null, access_token)
        isRefreshing = false

        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        isRefreshing = false

        // Clear auth storage and notify app of logout
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        window.dispatchEvent(new Event("auth-logout"))
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)
