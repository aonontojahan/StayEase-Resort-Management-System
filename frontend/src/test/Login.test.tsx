import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { BrowserRouter } from "react-router-dom"
import { Login } from "@/pages/Login"

vi.mock("@/store/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    login: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
  })),
}))

const renderLogin = () =>
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the login form with email and password fields", () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("shows validation errors for empty fields on submit", async () => {
    renderLogin()
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it("disables submit button while submitting", async () => {
    renderLogin()
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitBtn = screen.getByRole("button", { name: /sign in/i })

    await userEvent.type(emailInput, "test@example.com")
    await userEvent.type(passwordInput, "password123")
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(submitBtn).toBeDisabled()
    })
  })
})
