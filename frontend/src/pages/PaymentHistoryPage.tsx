import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Payment } from "@/types/api"
import { useToast } from "@/components/Toast"
import { CreditCard, Loader2, RefreshCw, CheckCircle, Clock } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-100 text-green-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Refunded: "bg-red-100 text-red-800",
}

export const PaymentHistoryPage: React.FC = () => {
  const { toastError } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const res = await api.get<Payment[]>("/payments/my")
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
    <div className="space-y-6 max-w-4xl">
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
          <div className="p-12 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-foreground">No payments found</p>
            <p className="text-sm mt-1">You haven't made any payments yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {payments.map((p) => (
              <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${p.status === 'Completed' ? 'bg-green-100 text-green-600' : p.status === 'Pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                    {p.status === 'Completed' ? <CheckCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">TK {p.amount.toFixed(2)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()} · {p.payment_method}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:items-end gap-1">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-700"} w-fit`}>
                    {p.status}
                  </span>
                  {p.transaction_ref && (
                    <p className="text-xs text-muted-foreground font-mono mt-1">Ref: {p.transaction_ref}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
