import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { Pagination } from "@/components/Pagination"

describe("Pagination", () => {
  it("renders page info correctly", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        onPageChange={vi.fn()}
      />
    )
    expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument()
    expect(screen.getByText(/Showing 1/)).toBeInTheDocument()
    expect(screen.getByText(/10 of 50/)).toBeInTheDocument()
  })

  it("disables Previous button on first page", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        onPageChange={vi.fn()}
      />
    )
    expect(screen.getByText("Previous")).toBeDisabled()
  })

  it("calls onPageChange when clicking Next", () => {
    const onPageChange = vi.fn()
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        onPageChange={onPageChange}
      />
    )
    fireEvent.click(screen.getByText("Next"))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it("does not render when totalPages is 1 or less", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={0}
        totalItems={0}
        onPageChange={vi.fn()}
      />
    )
    expect(container.innerHTML).toBe("")
  })
})
