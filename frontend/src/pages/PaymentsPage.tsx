import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/services/api"
import { Payment, PaymentCreate, Booking, RevenueReport } from "@/types/api"
import { useAuth } from "@/store/AuthContext"
import { useToast } from "@/components/Toast"
import { Modal } from "@/components/Modal"
import {
  CreditCard, Plus, Loader2, RefreshCw, Search, DollarSign, Activity, Undo2
} from "lucide-react"

const paymentSchema = z.object({
  booking_id: z.string().min(1, "Booking required"),
  amount: z.coerce.number().min(0.01, "Amount must be > 0"),
  payment_method: z.string().default("Card"),
  transaction_ref: z.string().optional(),
  notes: z.string().optional(),
})

export const PaymentsPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [revenue, setRevenue] = useState<RevenueReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null)
  const [refunding, setRefunding] = useState(false)
  const [refundMethod, setRefundMethod] = useState("Stripe")
  const [refundRef, setRefundRef] = useState("")

  const REFUND_ROLES = ["Resort Owner", "Manager", "Accountant"]
  const canRefund = user && REFUND_ROLES.includes(user.role.name)

  const form = useForm<PaymentCreate>({ resolver: zodResolver(paymentSchema), defaultValues: { payment_method: "Card" } })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [paymentsRes, bookingsRes, revRes] = await Promise.all([
        api.get<Payment[]>("/payments/"),
        api.get<Booking[]>("/bookings/"),
        api.get<RevenueReport[]>("/reports/revenue")
      ])
      setPayments(paymentsRes.data)
      setBookings(bookingsRes.data)
      setRevenue(revRes.data)
    } catch {
      toastError("Failed to load payment data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = payments.filter((p) => {
    return (
      !search ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.booking.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.transaction_ref && p.transaction_ref.toLowerCase().includes(search.toLowerCase()))
    )
  })

  const onCreatePayment = async (data: PaymentCreate) => {
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

  const onRefund = async () => {
    if (!refundTarget) return
    setRefunding(true)
    try {
      const total = refundTarget.booking.total_amount
      const cancellationFee = total * 0.30
      const refundAmount = refundTarget.amount - cancellationFee

      await api.post("/refunds/", {
        payment_id: refundTarget.id,
        amount: Math.max(0, refundAmount),
        refund_method: refundMethod,
        cancellation_fee: cancellationFee,
        notes: refundRef ? `Ref: ${refundRef}` : undefined,
      })
      toastSuccess(`Refund of TK ${Math.max(0, refundAmount).toFixed(2)} initiated via ${refundMethod}.`)
      setRefundTarget(null)
      setRefundRef("")
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to process refund.")
    } finally {
      setRefunding(false)
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    Completed: "bg-green-100 text-green-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Refunded: "bg-red-100 text-red-800",
    CancelledFee: "bg-purple-100 text-purple-800",
  }

  const METHOD_COLORS: Record<string, string> = {
    Card: "bg-blue-100 text-blue-800",
    Cash: "bg-green-100 text-green-800",
    BankTransfer: "bg-purple-100 text-purple-800",
  }

  const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0)
  const totalCount = revenue.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> Payments
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{payments.length} total transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="rounded-lg border p-2 hover:bg-secondary transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" /> Total Revenue
          </p>
          <h3 className="text-2xl font-bold">TK {totalRevenue.toFixed(2)}</h3>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" /> Transactions
          </p>
          <h3 className="text-2xl font-bold">{totalCount}</h3>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by transaction ref or booking ID..."
          className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Booking ID</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Ref</th>
                  <th className="px-5 py-3">Recorded By</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3.5 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">{p.booking.id.split("-")[0]}...</td>
                    <td className="px-5 py-3.5 font-bold">TK {p.amount.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${METHOD_COLORS[p.payment_method] || "bg-gray-100"}`}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[p.status] || "bg-gray-100"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{p.transaction_ref || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{p.recorded_by?.full_name || "—"}</td>
                    <td className="px-5 py-3.5">
                      {canRefund && p.status === "Completed" && (
                        <button
                          onClick={() => setRefundTarget(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Undo2 className="h-3 w-3" />
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={createOpen} title="Record Payment" onClose={() => { setCreateOpen(false); form.reset() }}>
        <form onSubmit={form.handleSubmit(onCreatePayment)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Booking</label>
            <select {...form.register("booking_id")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select booking...</option>
              {bookings.filter(b => b.status !== 'Cancelled').map((b) => (
                <option key={b.id} value={b.id}>{b.guest.full_name} - {b.booking_rooms.map(br => br.room.room_number).join(", ")} - Total: TK {b.total_amount}</option>
              ))}
            </select>
            {form.formState.errors.booking_id && <p className="text-[10px] text-destructive">{form.formState.errors.booking_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Amount (TK)</label>
              <input {...form.register("amount")} type="number" step="0.01" className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {form.formState.errors.amount && <p className="text-[10px] text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
              <select {...form.register("payment_method")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option>Card</option>
                <option>Cash</option>
                <option>BankTransfer</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Transaction Reference (Optional)</label>
            <input {...form.register("transaction_ref")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. TXN-12345" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</label>
            <textarea {...form.register("notes")} rows={2} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setCreateOpen(false); form.reset() }} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={form.formState.isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {form.formState.isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!refundTarget} title="Process Refund" onClose={() => { if (!refunding) { setRefundTarget(null); setRefundRef("") }}}>
        {refundTarget && (
          <div className="space-y-5">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                <Undo2 className="h-4 w-4" />
                Cancellation Policy
              </div>
              <p className="text-sm text-amber-600">
                30% cancellation fee (TK {(refundTarget.booking.total_amount * 0.30).toFixed(2)}) retained by resort.
                70% refunded to guest: TK {Math.max(0, refundTarget.amount - refundTarget.booking.total_amount * 0.30).toFixed(2)}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Payment</span>
                <span className="font-bold">TK {refundTarget.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (30%)</span>
                <span className="font-bold text-destructive">- TK {(refundTarget.booking.total_amount * 0.30).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Net Refund</span>
                <span className="text-emerald-600">TK {Math.max(0, refundTarget.amount - refundTarget.booking.total_amount * 0.30).toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Refund Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="block w-full rounded-lg border bg-card py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Stripe">Stripe (Auto - goes back to card)</option>
                <option value="Cash">Cash (Immediate)</option>
                <option value="bKash">bKash (Manual)</option>
                <option value="Nagad">Nagad (Manual)</option>
                <option value="Rocket">Rocket (Manual)</option>
                <option value="BankTransfer">Bank Transfer (Manual)</option>
              </select>
              {refundMethod !== "Stripe" && refundMethod !== "Cash" && (
                <p className="text-[10px] text-amber-600 mt-1">Manual refund — mark as completed when money is sent.</p>
              )}
              {refundMethod === "Stripe" && (
                <p className="text-[10px] text-emerald-600 mt-1">Automatic — refund will be processed via Stripe immediately.</p>
              )}
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
              <button onClick={() => { setRefundTarget(null); setRefundRef("") }} disabled={refunding} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={onRefund} disabled={refunding} className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-destructive/90 transition-colors">
                {refunding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Undo2 className="h-3.5 w-3.5" />
                {refundMethod === "Stripe" || refundMethod === "Cash" ? "Process Refund Now" : "Initiate Refund"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
