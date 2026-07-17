import React, { useEffect, useState, useMemo } from "react"
import { api, apiGet } from "@/services/api"
import { HousekeepingTask } from "@/types/api"
import { useToast } from "@/components/Toast"
import { useWebSocket } from "@/hooks/useWebSocket"
import { Badge } from "@/components/ui/Badge"
import {
  Sparkles, Loader2, RefreshCw, ChevronDown,
  Clock, AlertTriangle, CheckCircle2, ListTodo,
  BedDouble, Wrench
} from "lucide-react"

const PRIORITY_VARIANT: Record<string, "neutral" | "warning" | "danger"> = {
  Low: "neutral",
  Medium: "warning",
  High: "danger",
}

export const HousekeepingTasksPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [tasks, setTasks] = useState<HousekeepingTask[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { connected, onMessage } = useWebSocket("housekeeping")

  useEffect(() => {
    const unsubscribe = onMessage("housekeeping_task", () => {
      fetchTasks()
    })
    return unsubscribe
  }, [onMessage])

  useEffect(() => {
    if (connected) return
    const interval = setInterval(fetchTasks, 60000)
    return () => clearInterval(interval)
  }, [connected])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const [tasksRes, roomsRes] = await Promise.allSettled([
        apiGet<HousekeepingTask[]>("/housekeeping/"),
        apiGet<any[]>("/rooms/"),
      ])
      if (tasksRes.status === "fulfilled") setTasks(tasksRes.value.data)
      else toastError("Failed to load your tasks.")
      if (roomsRes.status === "fulfilled") setRooms(roomsRes.value.data)
    } catch {
      toastError("Failed to load data.")
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
      toastSuccess(`Task marked as ${status === "Done" ? "completed" : "in progress"}.`)
      fetchTasks()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update task.")
    } finally {
      setUpdatingId(null)
    }
  }

  const stats = useMemo(() => {
    const total = tasks.length
    const inProgress = tasks.filter((t) => t.status === "InProgress").length
    const highPriority = tasks.filter((t) => t.priority === "High").length
    const today = new Date().toISOString().split("T")[0]
    const completedToday = tasks.filter(
      (t) => t.status === "Done" && t.completed_at?.startsWith(today)
    ).length
    return { total, inProgress, highPriority, completedToday }
  }, [tasks])

  const roomStats = useMemo(() => {
    const cleaning = rooms.filter((r) => r.status === "Cleaning").length
    const maintenance = rooms.filter((r) => r.status === "Maintenance").length
    const available = rooms.filter((r) => r.status === "Available").length
    return { cleaning, maintenance, available }
  }, [rooms])

  const sortedTasks = useMemo(() => {
    const high = tasks.filter((t) => t.priority === "High")
    const rest = tasks.filter((t) => t.priority !== "High")
    return { high, rest }
  }, [tasks])

  const isOverdue = (task: HousekeepingTask) => {
    if (!task.due_date || task.status === "Done") return false
    const today = new Date().toISOString().split("T")[0]
    return task.due_date < today
  }

  const renderTaskCard = (task: HousekeepingTask) => (
    <div
      key={task.id}
      className={`rounded-xl border bg-card p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow flex flex-col h-full ${
        isOverdue(task) ? "border-red-300 bg-red-50/30 dark:bg-red-950/10" : ""
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-lg leading-tight truncate">{task.title}</h3>
          <p className="text-sm text-primary font-medium mt-1">
            Room {task.room.room_number}
            {task.room.floor && (
              <span className="text-muted-foreground font-normal ml-1">
                · Floor {task.room.floor}
              </span>
            )}
          </p>
        </div>
        <Badge variant={PRIORITY_VARIANT[task.priority] || "neutral"}>
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="text-sm text-muted-foreground flex-1">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {task.due_date && (
          <span
            className={`text-xs font-medium rounded-md px-2 py-1 w-fit flex items-center gap-1 ${
              isOverdue(task)
                ? "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300"
                : "bg-muted text-muted-foreground border"
            }`}
          >
            <Clock className="h-3 w-3" />
            {isOverdue(task) ? "Overdue: " : "Due: "}
            {task.due_date}
          </span>
        )}
        {task.assigned_to && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md border">
            {task.assigned_to.full_name}
          </span>
        )}
      </div>

      <div className="pt-2 border-t mt-auto">
        {updatingId === task.id ? (
          <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="relative">
            <select
              value={task.status}
              onChange={(e) => updateStatus(task, e.target.value)}
              className={`w-full rounded-lg border py-2 pl-3 pr-8 text-sm font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                task.status === "InProgress"
                  ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300"
              }`}
            >
              <option value="InProgress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> My Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your assigned housekeeping tasks at a glance.
            {connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchTasks} className="rounded-lg border p-2 hover:bg-secondary transition-colors w-fit" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 w-full">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <ListTodo className="h-3 w-3" /> Total Tasks
              </p>
              <h3 className="text-3xl font-bold text-primary">{stats.total}</h3>
              <p className="text-[10px] text-muted-foreground">Assigned to you</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Loader2 className="h-3 w-3" /> In Progress
              </p>
              <h3 className="text-3xl font-bold text-blue-600">{stats.inProgress}</h3>
              <p className="text-[10px] text-muted-foreground">Currently working</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> High Priority
              </p>
              <h3 className="text-3xl font-bold text-red-600">{stats.highPriority}</h3>
              <p className="text-[10px] text-muted-foreground">Needs immediate attention</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed Today
              </p>
              <h3 className="text-3xl font-bold text-emerald-600">{stats.completedToday}</h3>
              <p className="text-[10px] text-muted-foreground">Tasks finished</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 w-full">
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Rooms to Clean</p>
                <h4 className="text-2xl font-bold text-yellow-600">{roomStats.cleaning}</h4>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Wrench className="h-6 w-6 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Under Maintenance</p>
                <h4 className="text-2xl font-bold text-red-600">{roomStats.maintenance}</h4>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <BedDouble className="h-6 w-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Rooms Available</p>
                <h4 className="text-2xl font-bold text-green-600">{roomStats.available}</h4>
              </div>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-bold text-foreground">No tasks assigned</h3>
              <p className="mt-1">You have no pending housekeeping tasks at the moment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedTasks.high.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4" /> High Priority
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {sortedTasks.high.map(renderTaskCard)}
                  </div>
                </section>
              )}

              {sortedTasks.rest.length > 0 && (
                <section>
                  {sortedTasks.high.length > 0 && (
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                      Other Tasks
                    </h3>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {sortedTasks.rest.map(renderTaskCard)}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
