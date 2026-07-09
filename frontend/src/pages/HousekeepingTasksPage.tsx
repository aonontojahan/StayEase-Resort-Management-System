import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { HousekeepingTask } from "@/types/api"
import { useToast } from "@/components/Toast"
import { Sparkles, Loader2, RefreshCw, ChevronDown } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  InProgress: "bg-blue-100 text-blue-800",
  Done: "bg-green-100 text-green-800",
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Medium: "bg-orange-100 text-orange-700",
  High: "bg-red-100 text-red-700",
}

export const HousekeepingTasksPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [tasks, setTasks] = useState<HousekeepingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await api.get<HousekeepingTask[]>("/housekeeping/")
      setTasks(res.data)
    } catch {
      toastError("Failed to load your tasks.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const updateStatus = async (task: HousekeepingTask, status: string) => {
    setUpdatingId(task.id)
    try {
      await api.patch(`/housekeeping/${task.id}/status`, { status })
      toastSuccess(`Task updated to ${status}.`)
      fetchTasks()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update task.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> My Tasks
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your assigned housekeeping duties.</p>
        </div>
        <button onClick={fetchTasks} className="rounded-lg border p-2 hover:bg-secondary transition-colors w-fit" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-bold text-foreground">No tasks assigned</h3>
          <p className="mt-1">You have no pending housekeeping tasks at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{task.title}</h3>
                  <p className="text-sm text-primary font-medium mt-1">Room {task.room.room_number}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
              </div>

              {task.description && (
                <p className="text-sm text-muted-foreground flex-1">{task.description}</p>
              )}

              {task.due_date && (
                <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1 w-fit">
                  Due: {task.due_date}
                </p>
              )}

              <div className="pt-2 border-t mt-auto">
                {updatingId === task.id ? (
                  <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="relative">
                    <select
                      value={task.status}
                      onChange={(e) => updateStatus(task, e.target.value)}
                      className={`w-full rounded-lg border py-2 pl-3 pr-8 text-sm font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${STATUS_COLORS[task.status]}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
