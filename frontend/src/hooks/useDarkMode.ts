import { useEffect, useState } from "react"

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false
    const stored = localStorage.getItem("stayEaseDarkMode")
    if (stored !== null) return stored === "true"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("stayEaseDarkMode", String(dark))
  }, [dark])

  const toggle = () => setDark((d) => !d)

  return { dark, toggle }
}
