import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ToastProvider, useToast } from "@/components/Toast"
import React from "react"

const TestComponent: React.FC = () => {
  const { toastSuccess } = useToast()
  return (
    <button onClick={() => toastSuccess("Test message")}>
      Show Toast
    </button>
  )
}

describe("Toast", () => {
  it("renders provider without crashing", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    expect(screen.getByText("Show Toast")).toBeInTheDocument()
  })
})
