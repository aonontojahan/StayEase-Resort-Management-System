import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ToastProvider, useToast } from "@/components/Toast"
import React from "react"

const TestComponent: React.FC = () => {
  const { toastSuccess, toastError, toastInfo } = useToast()
  return (
    <div>
      <button onClick={() => toastSuccess("Success message")}>
        Show Success
      </button>
      <button onClick={() => toastError("Error message")}>
        Show Error
      </button>
      <button onClick={() => toastInfo("Info message")}>
        Show Info
      </button>
    </div>
  )
}

describe("Toast", () => {
  it("renders provider without crashing", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    expect(screen.getByText("Show Success")).toBeInTheDocument()
    expect(screen.getByText("Show Error")).toBeInTheDocument()
    expect(screen.getByText("Show Info")).toBeInTheDocument()
  })

  it("shows success toast when triggered", () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Success"))
    expect(screen.getByText("Success message")).toBeInTheDocument()
    vi.useRealTimers()
  })

  it("shows error toast when triggered", () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Error"))
    expect(screen.getByText("Error message")).toBeInTheDocument()
    vi.useRealTimers()
  })

  it("shows info toast when triggered", () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Info"))
    expect(screen.getByText("Info message")).toBeInTheDocument()
    vi.useRealTimers()
  })

  it("removes toast after timeout", () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText("Show Success"))
    expect(screen.getByText("Success message")).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText("Success message")).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
