import React from "react"
import { vi } from "vitest"

export const mockUser = {
  id: "test-user-id",
  email: "test@stayease.com",
  full_name: "Test User",
  phone_number: "+8801700000000",
  is_active: true,
  is_verified: true,
  role: { id: "role-id", name: "Resort Owner", description: "Owner", permissions: [] },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  loading: false,
}

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
)

vi.mock("@/store/AuthContext", () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: MockAuthProvider,
}))
