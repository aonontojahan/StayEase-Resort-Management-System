import React, { useEffect, useState, useMemo } from "react"
import { api, apiGet } from "@/services/api"
import { Payment, RevenueReport, Refund, RefundSummary, InvoiceSummary } from "@/types/api"
import { useToast } from "@/components/Toast"
import { Modal } from "@/components/Modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  CreditCard, Plus, Loader2, RefreshCw, Search,
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  Download, RotateCcw, Filter, Calendar, AlertCircle,
  CheckCircle2, XCircle, FileText,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────
interface RevenueSummary {
  total_revenue: number
  net_revenue: number
  total_payments: number
  completed_payments: number
  refunded_payments: number
  cancellation_fees: number
  actual_refunded: number
}

interface CancellationFeeMonthly {
  month: string
  fees: number
  count: number
}

interface CancellationFeeReport {
  total_fees: number
  total_cancellations: number
  monthly: CancellationFeeMonthly[]
}

// ── Payment form schema ───────────────────────────────────────────────────
const paymentSchema = z.object({
  booking_id: z.string().min(1, "Booking required"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  payment_method: z.string().default("Card"),
  transaction_ref: z.string().optional(),
  notes: z.string().optional(),
})
type PaymentFormValues = z.infer<typeof paymentSchema>

// ── Helpers ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-800",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  Refunded: {
    label: "Refunded",
    color: "bg-red-100 text-red-800",
    icon: <XCircle className="h-3 w-3" />,
  },

  Cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    icon: <XCircle className="h-3 w-3" />,
  },
}

const METHOD_CONFIG: Record<string, string> = {
  Card:         "bg-blue-100 text-blue-800",
  Cash:         "bg-green-100 text-green-800",
  BankTransfer: "bg-purple-100 text-purple-800",
  bKash:        "bg-pink-100 text-black",
  Nagad:        "bg-orange-100 text-black",
  Rocket:       "bg-red-100 text-black",
}

function exportToCSV(payments: Payment[]) {
  const headers = [
    "Date", "Booking ID", "Amount (TK)", "Method",
    "Status", "Cancellation Fee", "Transaction Ref", "Recorded By", "Notes",
  ]
  const rows = payments.map((p) => [
    new Date(p.created_at).toLocaleDateString(),
    p.booking.id.slice(0, 8) + "...",
    p.amount.toFixed(2),
    p.payment_method,
    p.status,
    p.cancellation_fee ? p.cancellation_fee.toFixed(2) : "",
    p.transaction_ref || "",
    p.recorded_by?.full_name || "—",
    p.notes || "",
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `stayease-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main Component ────────────────────────────────────────────────────────
export const AccountantPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()

  const [payments, setPayments]         = useState<Payment[]>([])
  const [bookings, setBookings]         = useState<any[]>([])
  const [summary, setSummary]           = useState<RevenueSummary | null>(null)
  const [revenue, setRevenue]           = useState<RevenueReport[]>([])
  const [loading, setLoading]           = useState(true)
  const [refunds, setRefunds]           = useState<Refund[]>([])
  const [refundSummary, setRefundSummary] = useState<RefundSummary | null>(null)
  const [showRefundHistory, setShowRefundHistory] = useState(false)
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null)
  const [cancellationFees, setCancellationFees] = useState<CancellationFeeReport | null>(null)

  const [search, setSearch]             = useState("")
  const [filterMethod, setFilterMethod] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo]     = useState("")
  const [createOpen, setCreateOpen]     = useState(false)
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null)
  const [refunding, setRefunding]       = useState(false)
  const [refundMethod, setRefundMethod] = useState("Stripe")
  const [refundRef, setRefundRef]       = useState("")

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { payment_method: "Card" },
  })

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true)
    let hasError = false

    const safeFetch = async <T,>(fn: () => Promise<T>, setter: (v: T) => void, label: string) => {
      try {
        const res = await fn()
        setter(res)
      } catch (err: any) {
        hasError = true
        const status = err?.response?.status
        const detail = err?.response?.data?.detail || ""
        console.warn(`[Accountant] Failed to load ${label}${status ? ` (${status})` : ""}: ${detail}`)
      }
    }

    await Promise.all([
      safeFetch(() => apiGet<Payment[]>("/payments/").then(r => r.data), setPayments, "payments"),
      safeFetch(() => apiGet<any[]>("/bookings/").then(r => r.data), setBookings, "bookings"),
      safeFetch(() => apiGet<RevenueSummary>("/payments/summary").then(r => r.data), setSummary, "revenue summary"),
      safeFetch(() => apiGet<RevenueReport[]>("/reports/revenue").then(r => r.data), setRevenue, "revenue report"),
      safeFetch(() => apiGet<Refund[]>("/refunds/").then(r => r.data), setRefunds, "refunds"),
      safeFetch(() => apiGet<RefundSummary>("/refunds/summary").then(r => r.data), setRefundSummary, "refund summary"),
      safeFetch(() => apiGet<InvoiceSummary>("/invoices/summary").then(r => r.data), setInvoiceSummary, "invoice summary"),
      safeFetch(() => apiGet<CancellationFeeReport>("/reports/cancellation-fees").then(r => r.data), setCancellationFees, "cancellation fees"),
    ])

    if (hasError) {
      toastError("Some financial data failed to load. Check console for details.")
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // ── Filters ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        !search ||
        p.id.toLowerCase().includes(q) ||
        p.booking.id.toLowerCase().includes(q) ||
        (p.transaction_ref && p.transaction_ref.toLowerCase().includes(q)) ||
        (p.recorded_by?.full_name && p.recorded_by.full_name.toLowerCase().includes(q))
      const matchMethod = !filterMethod || p.payment_method === filterMethod
      const matchStatus = !filterStatus || p.status === filterStatus
      const d = new Date(p.created_at)
      const matchFrom = !filterDateFrom || d >= new Date(filterDateFrom)
      const matchTo   = !filterDateTo   || d <= new Date(filterDateTo + "T23:59:59")
      return matchSearch && matchMethod && matchStatus && matchFrom && matchTo
    })
  }, [payments, search, filterMethod, filterStatus, filterDateFrom, filterDateTo])

  // ── Actions ──────────────────────────────────────────────────────────────
  const onCreatePayment = async (data: PaymentFormValues) => {
    try {
      await api.post("/payments/", data)
      toastSuccess("Payment recorded successfully!")
      setCreateOpen(false)
      form.reset()
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to record payment.")
    }
  }

  const CANCELLATION_FEE_RATE = 0.30

  const onConfirmRefund = async () => {
    if (!refundTarget) return
    setRefunding(true)
    try {
      const paymentAmount = refundTarget.amount
      const cancellationFee = Math.min(paymentAmount * CANCELLATION_FEE_RATE, paymentAmount)
      const refundAmount = paymentAmount - cancellationFee

      await api.post("/refunds/", {
        payment_id: refundTarget.id,
        amount: Math.max(0, refundAmount),
        refund_method: refundMethod,
        notes: refundRef ? `Ref: ${refundRef}` : undefined,
      })
      toastSuccess(`Refund of TK ${Math.max(0, refundAmount).toFixed(2)} initiated via ${refundMethod}.`)
      setRefundTarget(null)
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to process refund.")
    } finally {
      setRefunding(false)
      setRefundRef("")
    }
  }

  const clearFilters = () => {
    setSearch(""); setFilterMethod(""); setFilterStatus("")
    setFilterDateFrom(""); setFilterDateTo("")
  }

  const hasActiveFilters = !!(search || filterMethod || filterStatus || filterDateFrom || filterDateTo)
  const filteredRevenue  = filtered.filter(p => p.status === "Completed").reduce((s, p) => s + p.amount, 0)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            Financial Ledger
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Transaction audit · refund control · revenue reporting
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchData}
            className="rounded-lg border p-2 hover:bg-secondary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowRefundHistory(true)}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            Refunds
          </button>
          <button
            onClick={() => exportToCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            Export CSV
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Revenue</p>
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-indigo-600">
                  TK {(summary?.total_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total income before deductions</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net Revenue</p>
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-emerald-600">
                  TK {(summary?.net_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Revenue after fees retained</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Collected</p>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-blue-600">
                  TK {(summary?.completed_payments ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{summary?.total_payments ?? 0} completed payments</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cancellation Fees</p>
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-purple-600">
                  TK {(summary?.cancellation_fees ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">30% fee retained on cancellations</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Refunded</p>
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-red-500">
                  TK {(summary?.refunded_payments ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Original refund amounts</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actual Paid Out</p>
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-orange-600">
                  TK {(summary?.actual_refunded ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Net cash refunded (after fees)</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filtered View</p>
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-amber-600">
                  TK {filteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{filtered.length} records shown</p>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Breakdown */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" /> Monthly Revenue Breakdown
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                  <tr>
                    <th className="px-5 py-3">Month</th>
                    <th className="px-5 py-3 text-right">Transactions</th>
                    <th className="px-5 py-3 text-right">Gross Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {revenue.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No revenue data yet</p>
                        <p className="text-xs mt-0.5">Revenue will appear here once payments are completed.</p>
                      </td>
                    </tr>
                  ) : (
                    revenue.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium">{r.month}</td>
                        <td className="px-5 py-3 text-right font-mono text-muted-foreground">{r.count}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600">
                          TK {r.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Summary */}
          {invoiceSummary && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b bg-muted/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" /> Invoice Summary
                </h4>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0">
                <div className="p-5 text-center">
                  <p className="text-xs text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold mt-1">{invoiceSummary.total_invoices}</p>
                </div>
                <div className="p-5 text-center">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    TK {invoiceSummary.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{invoiceSummary.paid_count} invoices</p>
                </div>
                <div className="p-5 text-center">
                  <p className="text-xs text-muted-foreground">Unpaid / Outstanding</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    TK {invoiceSummary.total_unpaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{invoiceSummary.unpaid_count} invoices</p>
                </div>
                <div className="p-5 text-center">
                  <p className="text-xs text-muted-foreground">Collection Rate</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {invoiceSummary.total_invoices > 0
                      ? `${((invoiceSummary.total_paid / (invoiceSummary.total_paid + invoiceSummary.total_unpaid)) * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Paid vs total collectible</p>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Fee Breakdown */}
          {cancellationFees && cancellationFees.monthly.length > 0 && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-3.5 w-3.5" /> Cancellation Fee Breakdown
                </h4>
                <span className="text-xs text-muted-foreground">
                  TK {cancellationFees.total_fees.toLocaleString(undefined, { minimumFractionDigits: 2 })} total · {cancellationFees.total_cancellations} cancellations
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                    <tr>
                      <th className="px-5 py-3">Month</th>
                      <th className="px-5 py-3 text-right">Cancellations</th>
                      <th className="px-5 py-3 text-right">Fees Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cancellationFees.monthly.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium">{r.month}</td>
                        <td className="px-5 py-3 text-right font-mono text-muted-foreground">{r.count}</td>
                        <td className="px-5 py-3 text-right font-bold text-purple-600">
                          TK {r.fees.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter Transactions</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto flex items-center gap-1 text-xs text-destructive hover:underline font-medium"
                >
                  <RotateCcw className="h-3 w-3" /> Clear filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ref, booking ID, recorder..."
                  className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {/* Method */}
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="rounded-lg border bg-background py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="BankTransfer">Bank Transfer</option>
              </select>
              {/* Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border bg-background py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Refunded">Refunded</option>
                <option value="CancelledFee">Cancelled (Fee)</option>
              </select>
              {/* Date Range */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full rounded-lg border bg-background py-2 pl-7 pr-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    title="From date"
                  />
                </div>
                <div className="relative flex-1">
                  <Calendar className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full rounded-lg border bg-background py-2 pl-7 pr-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    title="To date"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" /> Transaction Ledger
              </h4>
              <span className="text-xs text-muted-foreground">{filtered.length} records</span>
            </div>

            {filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No transactions match your filters</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-2 text-sm text-primary hover:underline">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Booking</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Fee</th>
                      <th className="px-5 py-3">Ref #</th>
                      <th className="px-5 py-3">Recorded By</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const sc = STATUS_CONFIG[p.status]
                      return (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground text-xs">
                            {new Date(p.created_at).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                            {p.booking.id.slice(0, 8)}…
                          </td>
                          <td className="px-5 py-3.5 font-bold">
                            TK {p.amount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${METHOD_CONFIG[p.payment_method] || "bg-gray-100 text-gray-700"}`}>
                              {p.payment_method}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc?.color || "bg-gray-100 text-gray-700"}`}>
                              {sc?.icon}
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">
                            {p.cancellation_fee ? `TK ${p.cancellation_fee.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs font-mono">
                            {p.transaction_ref || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {p.recorded_by?.full_name || "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            {p.status === "Completed" ? (
                              <button
                                onClick={() => setRefundTarget(p)}
                                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" /> Refund
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      <Modal isOpen={createOpen} title="Record New Payment" onClose={() => { setCreateOpen(false); form.reset() }}>
        <form onSubmit={form.handleSubmit(onCreatePayment)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Booking</label>
            <select
              {...form.register("booking_id")}
              className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select booking...</option>
              {bookings
                .filter((b) => b.status !== "Cancelled")
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.guest?.full_name || b.id.slice(0, 8)} – Room {b.booking_rooms?.[0]?.room?.room_number ?? "?"} – TK {b.total_amount}
                  </option>
                ))}
            </select>
            {form.formState.errors.booking_id && (
              <p className="text-[10px] text-destructive">{form.formState.errors.booking_id.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Amount (TK)</label>
              <input
                {...form.register("amount")}
                type="number" step="0.01"
                className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {form.formState.errors.amount && (
                <p className="text-[10px] text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
              <select
                {...form.register("payment_method")}
                className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option>Cash</option>
                <option>Card</option>
                <option>BankTransfer</option>
                <option>bKash</option>
                <option>Nagad</option>
                <option>Rocket</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Transaction Reference (Optional)</label>
            <input
              {...form.register("transaction_ref")}
              className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. TXN-12345"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</label>
            <textarea
              {...form.register("notes")}
              rows={2}
              className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setCreateOpen(false); form.reset() }}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {form.formState.isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Refund Confirmation Modal */}
      <Modal isOpen={!!refundTarget} title="Process Refund" onClose={() => { setRefundTarget(null); setRefundRef("") }}>
        {refundTarget && (
          <div className="space-y-5">
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                <AlertCircle className="h-4 w-4" />
                This action cannot be undone
              </div>
              <p className="text-sm text-red-600">
                A 30% cancellation fee will be retained by the resort. The remaining 70% will be refunded to the guest.
              </p>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Payment</span>
                <span className="font-bold">TK {refundTarget.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancellation Fee (30%)</span>
                <span className="font-bold text-destructive">- TK {Math.min(refundTarget.amount * 0.30, refundTarget.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-semibold">Refund Amount</span>
                <span className="font-bold text-emerald-600">TK {Math.max(0, refundTarget.amount - refundTarget.amount * 0.30).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{refundTarget.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking</span>
                <span className="font-mono text-xs">{refundTarget.booking.id.slice(0, 16)}…</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Refund Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Cash">Cash (Immediate)</option>
                <option value="bKash">bKash (Manual)</option>
                <option value="Nagad">Nagad (Manual)</option>
                <option value="Rocket">Rocket (Manual)</option>
                <option value="BankTransfer">Bank Transfer (Manual)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Reference (Optional)</label>
              <input
                value={refundRef}
                onChange={(e) => setRefundRef(e.target.value)}
                placeholder="e.g. refund TXN ID or notes"
                className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => { setRefundTarget(null); setRefundRef("") }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmRefund}
                disabled={refunding}
                className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-destructive/90 transition-colors"
              >
                {refunding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <RotateCcw className="h-3.5 w-3.5" />
                {refundMethod === "Stripe" || refundMethod === "Cash" ? "Process Refund Now" : "Initiate Refund"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund History Modal */}
      <Modal isOpen={showRefundHistory} title="Refund History" onClose={() => setShowRefundHistory(false)} maxWidth="max-w-4xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {refundSummary && (
            <div className="grid grid-cols-2 gap-3 pb-3 border-b">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total Refunded</p>
                <p className="font-bold text-emerald-600">TK {refundSummary.total_refunded.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Fees Retained</p>
                <p className="font-bold text-purple-600">TK {refundSummary.total_cancellation_fees.toFixed(2)}</p>
              </div>
            </div>
          )}
          {refunds.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No refunds processed yet.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Fee</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Ref #</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-600">TK {r.amount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs">{r.cancellation_fee ? `TK ${r.cancellation_fee.toFixed(2)}` : "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.refund_method || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.status === "Completed" ? "bg-green-100 text-green-800" :
                        r.status === "Failed" ? "bg-red-100 text-red-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{r.transaction_ref || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  )
}
