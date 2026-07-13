import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Invoice as InvoiceType, InvoiceSummary } from "@/types/api"

interface InvoiceWithBooking extends InvoiceType {
  booking_total?: number
  booking_paid?: number
  guest_name?: string
  guest_email?: string
}
import { useAuth } from "@/store/AuthContext"
import { useToast } from "@/components/Toast"
import { Modal } from "@/components/Modal"
import {
  FileText, Loader2, RefreshCw, Eye, Download,
  CheckCircle2, Clock, XCircle, AlertCircle, DollarSign,
} from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: <Clock className="h-3 w-3" /> },
  Issued: { label: "Issued", color: "bg-blue-100 text-blue-800", icon: <FileText className="h-3 w-3" /> },
  Paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  Refunded: { label: "Refunded", color: "bg-purple-100 text-purple-800", icon: <DollarSign className="h-3 w-3" /> },
}

const InvoiceLogo = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
    <path d="M32 4L8 24v36h16V44h16v16h16V24L32 4z" fill="rgba(5,150,105,0.2)" />
    <path d="M32 10L12 26v30h12V40h16v16h12V26L32 10z" fill="#059669" />
    <rect x="28" y="42" width="8" height="12" fill="rgba(255,255,255,0.9)" rx="1" />
    <circle cx="32" cy="20" r="4" fill="#fbbf24" />
  </svg>
)

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth()
  const { toastSuccess, toastError } = useToast()
  const isStaff = user?.role.name !== "Guest"

  const [invoices, setInvoices] = useState<InvoiceWithBooking[]>([])
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithBooking | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const endpoint = isStaff ? "/invoices/" : "/invoices/my"
      const [invRes, sumRes] = await Promise.all([
        api.get<InvoiceWithBooking[]>(endpoint),
        isStaff ? api.get<InvoiceSummary>("/invoices/summary") : Promise.resolve(null),
      ])
      setInvoices(invRes.data)
      if (sumRes) setSummary(sumRes.data)
    } catch {
      toastError("Failed to load invoices.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status })
      toastSuccess(`Invoice marked as ${status}`)
      setSelectedInvoice(null)
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update invoice.")
    }
  }

  const downloadPdf = async (id: string) => {
    try {
      const res = await api.get(`/invoices/${id}/html?print=1`, { responseType: "blob" })
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/html" }))
      window.open(url, "_blank")
    } catch {
      toastError("Failed to download invoice PDF.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            {isStaff ? "Invoices & Billing" : "My Invoices"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isStaff ? "Manage guest invoices and billing records" : "View your stay invoices"}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg border p-2 hover:bg-secondary transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {isStaff && summary && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Invoices</p>
                <h3 className="text-2xl font-bold">{summary.total_invoices}</h3>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paid</p>
                <h3 className="text-2xl font-bold text-emerald-600">TK {summary.total_paid.toLocaleString()}</h3>
                <p className="text-[10px] text-muted-foreground">{summary.paid_count} invoices</p>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unpaid</p>
                <h3 className="text-2xl font-bold text-amber-600">TK {summary.total_unpaid.toLocaleString()}</h3>
                <p className="text-[10px] text-muted-foreground">{summary.unpaid_count} invoices</p>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cancelled</p>
                <h3 className="text-2xl font-bold text-red-500">TK {summary.total_cancelled.toLocaleString()}</h3>
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" /> Invoice Records
              </h4>
              <span className="text-xs text-muted-foreground">{invoices.length} invoices</span>
            </div>

            {invoices.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No invoices found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                    <tr>
                      <th className="px-5 py-3">Invoice #</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Subtotal</th>
                      <th className="px-5 py-3">Tax</th>
                      <th className="px-5 py-3">Total</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const sc = STATUS_CONFIG[inv.status]
                      return (
                        <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-xs font-semibold">
                            {inv.invoice_number}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {new Date(inv.issue_date).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5">TK {inv.subtotal.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {inv.tax_rate > 0 ? `TK ${inv.tax_amount.toFixed(2)} (${inv.tax_rate}%)` : "—"}
                          </td>
                          <td className="px-5 py-3.5 font-bold">TK {inv.total_amount.toFixed(2)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sc?.color || "bg-gray-100 text-gray-700"}`}>
                              {sc?.icon}
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                              >
                                <Eye className="h-3 w-3" /> View
                              </button>
                              <button
                                onClick={() => downloadPdf(inv.id)}
                                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <Download className="h-3 w-3" /> PDF
                              </button>
                            </div>
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

      <Modal isOpen={!!selectedInvoice} title="" onClose={() => setSelectedInvoice(null)}>
        {selectedInvoice && (
          <div className="space-y-0">
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 -mx-6 -mt-6 px-8 py-7 rounded-t-xl relative">
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-amber-500" />
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <InvoiceLogo />
                  <div>
                    <h3 className="text-xl font-bold text-white font-serif tracking-wide">StayEase Resort</h3>
                    <p className="text-emerald-200 text-xs">Luxury &middot; Comfort &middot; Serenity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-light text-white/90 tracking-widest uppercase">Invoice</p>
                  <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide text-white`}
                    style={{ backgroundColor: selectedInvoice.status === "Paid" ? "#059669" : selectedInvoice.status === "Issued" ? "#2563eb" : selectedInvoice.status === "Draft" ? "#6b7280" : "#dc2626" }}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 pb-2">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Bill To</p>
                  <p className="font-semibold text-sm">{selectedInvoice.guest_name || selectedInvoice.guest_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{selectedInvoice.guest_email || ""}</p>
                  <p className="text-xs text-muted-foreground">Booking #{selectedInvoice.booking_id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Invoice Details</p>
                  <p className="text-xs"><span className="text-muted-foreground">Number:</span> <span className="font-semibold">{selectedInvoice.invoice_number}</span></p>
                  <p className="text-xs"><span className="text-muted-foreground">Issued:</span> {new Date(selectedInvoice.issue_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  <p className="text-xs"><span className="text-muted-foreground">Due:</span> {new Date(selectedInvoice.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>

              <table className="w-full text-sm border-t border-b">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="py-2.5 px-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-28">Unit Price</th>
                    <th className="py-2.5 px-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10">
                      <td className="py-3 px-3 text-sm">{item.description}</td>
                      <td className="py-3 px-3 text-center text-sm">{item.quantity}</td>
                      <td className="py-3 px-3 text-right text-sm">TK {item.unit_price.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-sm font-semibold">TK {item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Payment Breakdown */}
              {selectedInvoice.booking_total && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Payment Summary</p>
                  {(() => {
                    const total = selectedInvoice.booking_total!
                    const paid = selectedInvoice.booking_paid!
                    const invoiceAmt = selectedInvoice.total_amount
                    const prevPaid = paid - invoiceAmt
                    const remaining = total - paid
                    const isFullyPaid = remaining <= 0.01
                    return (
                      <div className="space-y-1 text-sm">
                        {prevPaid > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pre-payment ({Math.round(prevPaid/total*100)}%)</span>
                            <span className="font-medium">TK {prevPaid.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {prevPaid > 0 ? "Due Payment" : "Full Payment"} ({Math.round(invoiceAmt/total*100)}%)
                          </span>
                          <span className="font-bold text-emerald-700">TK {invoiceAmt.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between ${isFullyPaid ? "border-t-2 border-emerald-500 pt-1.5 mt-1.5" : "border-t pt-1.5 mt-1.5"}`}>
                          <span className="font-bold">Total ({Math.round(total/total*100)}%)</span>
                          <span className="font-bold text-emerald-700">TK {total.toFixed(2)}</span>
                        </div>
                        {isFullyPaid ? (
                          <p className="text-[11px] text-emerald-600 font-semibold text-right mt-0.5">✓ Fully Paid</p>
                        ) : (
                          <p className="text-[11px] text-destructive font-semibold text-right mt-0.5">Due: TK {remaining.toFixed(2)}</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              <div className="ml-auto w-64 pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>TK {selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                {selectedInvoice.tax_rate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({selectedInvoice.tax_rate}%)</span>
                    <span>TK {selectedInvoice.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-emerald-600 border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>TK {selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <p className="mt-4 text-xs text-muted-foreground border-t pt-3">
                  <span className="font-semibold">Notes:</span> {selectedInvoice.notes}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <div className="flex gap-2">
                {isStaff && selectedInvoice.status !== "Paid" && selectedInvoice.status !== "Cancelled" && selectedInvoice.status !== "Refunded" && (
                  <>
                    {selectedInvoice.status === "Draft" && (
                      <button onClick={() => updateStatus(selectedInvoice.id, "Issued")}
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                        Issue Invoice
                      </button>
                    )}
                    {selectedInvoice.status === "Issued" && (
                      <button onClick={() => updateStatus(selectedInvoice.id, "Paid")}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                        Mark as Paid
                      </button>
                    )}
                    <button onClick={() => updateStatus(selectedInvoice.id, "Cancelled")}
                      className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                      Cancel
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => downloadPdf(selectedInvoice.id)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
