import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Invoice, InvoiceSummary } from "@/types/api"
import { useAuth } from "@/store/AuthContext"
import { useToast } from "@/components/Toast"
import { Modal } from "@/components/Modal"
import {
  FileText, Loader2, RefreshCw, Eye,
  CheckCircle2, Clock, XCircle, AlertCircle, DollarSign,
} from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: <Clock className="h-3 w-3" /> },
  Issued: { label: "Issued", color: "bg-blue-100 text-blue-800", icon: <FileText className="h-3 w-3" /> },
  Paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  Refunded: { label: "Refunded", color: "bg-purple-100 text-purple-800", icon: <DollarSign className="h-3 w-3" /> },
}

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth()
  const { toastSuccess, toastError } = useToast()
  const isStaff = user?.role.name !== "Guest"

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const endpoint = isStaff ? "/invoices/" : "/invoices/my"
      const [invRes, sumRes] = await Promise.all([
        api.get<Invoice[]>(endpoint),
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
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                            >
                              <Eye className="h-3 w-3" /> View
                            </button>
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

      <Modal isOpen={!!selectedInvoice} title={selectedInvoice?.invoice_number || "Invoice"} onClose={() => setSelectedInvoice(null)}>
        {selectedInvoice && (
          <div className="space-y-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Issue Date: {new Date(selectedInvoice.issue_date).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">Due Date: {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[selectedInvoice.status]?.color}`}>
                {STATUS_CONFIG[selectedInvoice.status]?.icon}
                {selectedInvoice.status}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                  <tr>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">{item.description}</td>
                      <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right">TK {item.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">TK {item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>TK {selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              {selectedInvoice.tax_rate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({selectedInvoice.tax_rate}%)</span>
                  <span>TK {selectedInvoice.tax_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-1.5">
                <span>Total</span>
                <span className="text-primary">TK {selectedInvoice.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {isStaff && selectedInvoice.status !== "Paid" && selectedInvoice.status !== "Cancelled" && selectedInvoice.status !== "Refunded" && (
              <div className="flex justify-end gap-3 pt-2 border-t">
                {selectedInvoice.status === "Draft" && (
                  <button
                    onClick={() => updateStatus(selectedInvoice.id, "Issued")}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Issue Invoice
                  </button>
                )}
                {selectedInvoice.status === "Issued" && (
                  <button
                    onClick={() => updateStatus(selectedInvoice.id, "Paid")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Mark as Paid
                  </button>
                )}
                <button
                  onClick={() => updateStatus(selectedInvoice.id, "Cancelled")}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Cancel Invoice
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}