import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/services/api"
import { HousekeepingTask, TaskCreate, Room } from "@/types/api"
import { User } from "@/types/auth"
import { TableSkeleton } from "@/components/Skeleton"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useToast } from "@/components/Toast"
import { Modal, ConfirmModal } from "@/components/Modal"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  Sparkles, Plus, Loader2, RefreshCw, Search, Trash2, ChevronDown,
} from "lucide-react"

const TASK_STATUS_VARIANT: Record<string, "warning" | "info" | "success"> = {
  Pending: "warning",
  InProgress: "info",
  Done: "success",
}

const PRIORITY_VARIANT: Record<string, "neutral" | "warning" | "danger"> = {
  Low: "neutral",
  Medium: "warning",
  High: "danger",
}

const taskSchema = z.object({
  room_id: z.string().min(1, "Room required"),
  assigned_to_id: z.string().optional(),
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  priority: z.string().default("Medium"),
  due_date: z.string().optional(),
})

export const HousekeepingPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [tasks, setTasks] = useState<HousekeepingTask[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [housekeepers, setHousekeepers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTask, setDeleteTask] = useState<HousekeepingTask | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { connected, onMessage } = useWebSocket("housekeeping")

  useEffect(() => {
    const unsubscribe = onMessage("housekeeping_task", () => {
      fetchData()
    })
    return unsubscribe
  }, [onMessage])

  useEffect(() => {
    if (connected) return
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [connected])

  const form = useForm<TaskCreate>({ resolver: zodResolver(taskSchema), defaultValues: { priority: "Medium" } })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tasksRes, roomsRes, usersRes] = await Promise.all([
        api.get<HousekeepingTask[]>("/housekeeping/"),
        api.get<Room[]>("/rooms"),
        api.get<User[]>("/auth/users"),
      ])
      setTasks(tasksRes.data)
      setRooms(roomsRes.data)
      setHousekeepers(usersRes.data.filter((u) => u.role.name === "Housekeeping"))
    } catch {
      toastError("Failed to load housekeeping data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = tasks.filter((t) => {
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.room.room_number.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || t.status === filterStatus
    return matchSearch && matchStatus
  })

  const onCreateTask = async (data: TaskCreate) => {
    try {
      const payload = {
        ...data,
        assigned_to_id: data.assigned_to_id || undefined,
        due_date: data.due_date || undefined,
      }
      await api.post("/housekeeping/", payload)
      toastSuccess("Task created!")
      setCreateOpen(false)
      form.reset()
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to create task.")
    }
  }

  const updateStatus = async (task: HousekeepingTask, status: string) => {
    setUpdatingId(task.id)
    try {
      await api.patch(`/housekeeping/${task.id}/status`, { status })
      toastSuccess(`Task updated to ${status}.`)
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update task.")
    } finally {
      setUpdatingId(null)
    }
  }

  const onDeleteTask = async () => {
    if (!deleteTask) return
    try {
      await api.delete(`/housekeeping/${deleteTask.id}`)
      toastSuccess("Task deleted.")
      setDeleteTask(null)
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to delete task.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Housekeeping
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} total tasks{tasks.filter(t => t.status === "Pending").length > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
              {tasks.filter(t => t.status === "Pending").length} pending
            </span>
          )}
            {connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="rounded-lg border p-2 hover:bg-secondary transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New Task
          </Button>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-3">
        {["Pending", "InProgress", "Done"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
              filterStatus === s
                ? (s === "Pending" ? "bg-yellow-100 text-yellow-800" :
                   s === "InProgress" ? "bg-blue-100 text-blue-800" :
                   "bg-green-100 text-green-800") + " border-transparent"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s === "InProgress" ? "In Progress" : s}
            <span className="font-bold">{tasks.filter((t) => t.status === s).length}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by task title or room..."
          className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Task cards */}
      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground rounded-xl border bg-card">
          <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tasks found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((task) => (
            <div key={task.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-semibold truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">Room {task.room.room_number} · {task.room.room_type.name} · Floor {task.room.floor}</p>
                </div>
                <button
                  onClick={() => setDeleteTask(task)}
                  className="shrink-0 rounded-lg border p-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {task.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{task.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant={TASK_STATUS_VARIANT[task.status] || "neutral"}>
                  {task.status === "InProgress" ? "In Progress" : task.status}
                </Badge>
                <Badge variant={PRIORITY_VARIANT[task.priority] || "neutral"}>
                  {task.priority}
                </Badge>
              </div>

              {task.assigned_to && (
                <p className="text-xs text-muted-foreground">
                  Assigned to: <span className="font-medium text-foreground">{task.assigned_to.full_name}</span>
                </p>
              )}

              {task.due_date && (
                <p className={`text-xs ${new Date(task.due_date) < new Date() && task.status !== "Done" ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                  {new Date(task.due_date) < new Date() && task.status !== "Done" ? "🔴 Overdue: " : "Due: "}
                  {task.due_date}
                </p>
              )}

              {updatingId === task.id ? (
                <div className="flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="flex gap-2">
                  {task.status === "InProgress" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Sparkles className="h-3 w-3" />}
                      onClick={() => updateStatus(task, "Done")}
                    >
                      Mark Done
                    </Button>
                  )}
                  <div className="relative flex-1">
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) updateStatus(task, e.target.value) }}
                      className="w-full rounded-lg border bg-secondary py-1.5 pl-3 pr-8 text-xs font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Change status...</option>
                      {["Pending", "InProgress", "Done"].filter((s) => s !== task.status).map((s) => (
                        <option key={s} value={s}>{s === "InProgress" ? "In Progress" : s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={createOpen} title="Create Housekeeping Task" onClose={() => { setCreateOpen(false); form.reset() }}>
        <form onSubmit={form.handleSubmit(onCreateTask)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Title</label>
            <input {...form.register("title")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Deep clean room" />
            {form.formState.errors.title && <p className="text-[10px] text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Room</label>
              <select {...form.register("room_id")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select room...</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>Room {r.room_number}</option>
                ))}
              </select>
              {form.formState.errors.room_id && <p className="text-[10px] text-destructive">{form.formState.errors.room_id.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Priority</label>
              <select {...form.register("priority")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Assign To (optional)</label>
              <select {...form.register("assigned_to_id")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Unassigned</option>
                {housekeepers.map((h) => (
                  <option key={h.id} value={h.id}>{h.full_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Due Date (optional)</label>
              <input {...form.register("due_date")} type="date" className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Description (optional)</label>
            <textarea {...form.register("description")} rows={3} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setCreateOpen(false); form.reset() }}>Cancel</Button>
            <Button type="submit" loading={form.formState.isSubmitting}>Create Task</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTask}
        title="Delete Task"
        message={`Delete task "${deleteTask?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={onDeleteTask}
        onCancel={() => setDeleteTask(null)}
        danger
      />
    </div>
  )
}
