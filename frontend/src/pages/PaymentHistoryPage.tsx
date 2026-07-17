import React, { useEffect, useState } from "react"
import { apiGet } from "@/services/api"
import { Payment } from "@/types/api"
import { useToast } from "@/components/Toast"
import { CreditCard, Loader2, RefreshCw, CalendarDays, Hash, DoorOpen, Banknote } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-100 text-green-800",
  Refunded: "bg-red-100 text-red-800",
}

const METHOD_COLORS: Record<string, string> = {
  Card: "bg-blue-100 text-blue-800",
  Cash: "bg-green-100 text-green-800",
  BankTransfer: "bg-purple-100 text-purple-800",
  bKash: "bg-pink-100 text-black",
  Nagad: "bg-orange-100 text-black",
  Rocket: "bg-red-100 text-black",
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

export const PaymentHistoryPage: React.FC = () => {
  const { toastError } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const res = await apiGet<Payment[]>("/payments/my")
      setPayments(res.data)
    } catch {
      toastError("Failed to load your payment history.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> Payment History
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">View your past transactions and receipts.</p>
        </div>
        <button onClick={fetchPayments} className="rounded-lg border p-2 hover:bg-secondary transition-colors w-fit" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 rounded-xl border-2 border-dashed bg-card/50 shadow-sm">
            <div className="rounded-full bg-primary/10 p-5 mb-5">
              <CreditCard className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No payments found</h3>
            <p className="text-muted-foreground mt-1.5 mb-6 text-center max-w-sm">You haven't made any payments yet. Payments appear here once you complete a booking.</p>
            <a
              href="/browse-rooms"
              onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "Browse Rooms" })) }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all hover:shadow-lg active:scale-[0.98]"
            >
              <CreditCard className="h-4 w-4" />
              Browse Rooms
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="text-left py-3 px-4 font-semibold"><span className="flex items-center gap-1.5"><DoorOpen className="h-3.5 w-3.5" /> Room</span></th>
                  <th className="text-left py-3 px-4 font-semibold"><span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> Confirmation</span></th>
                  <th className="text-left py-3 px-4 font-semibold"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Check-in</span></th>
                  <th className="text-left py-3 px-4 font-semibold"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Check-out</span></th>
                  <th className="text-left py-3 px-4 font-semibold"><span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Amount</span></th>
                  <th className="text-left py-3 px-4 font-semibold">Method</th>
                  <th className="text-right py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => {
                  const room = p.booking.booking_rooms?.[0]
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        {room ? room.room.room_number : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span title={p.booking.id} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          #{shortId(p.booking.id)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {room ? fmt(room.check_in_date) : "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {room ? fmt(room.check_out_date) : "—"}
                      </td>
                      <td className="py-3 px-4 font-semibold">TK {p.amount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${METHOD_COLORS[p.payment_method] || "bg-gray-100 text-gray-700"}`}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-700"}`}>
                          {p.status}
                        </span>
                        {p.transaction_ref && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Ref: {p.transaction_ref}</p>
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
    </div>
  )
}
