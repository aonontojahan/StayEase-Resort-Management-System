import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/services/api"
import { Room, RoomType, RoomCreate, RoomUpdate, RoomTypeCreate } from "@/types/api"
import { Pagination } from "@/components/Pagination"
import { TableSkeleton } from "@/components/Skeleton"
import { useToast } from "@/components/Toast"
import { Modal, ConfirmModal } from "@/components/Modal"
import {
  BedDouble, Plus, Pencil, Trash2, Loader2, RefreshCw,
  Search, Filter, Tag, ChevronDown, Sparkles,
} from "lucide-react"

const roomCreateSchema = z.object({
  room_number: z.string().min(1, "Room number required").max(10),
  floor: z.coerce.number().min(0, "Floor must be ≥ 0"),
  notes: z.string().optional(),
  room_type_id: z.string().min(1, "Room type required"),
})

const roomUpdateSchema = z.object({
  room_number: z.string().min(1).max(10).optional(),
  floor: z.coerce.number().min(0).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  room_type_id: z.string().optional(),
})

const roomTypeSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  base_price_per_night: z.coerce.number().min(1, "Price must be > 0"),
  max_occupancy: z.coerce.number().min(1, "Occupancy must be ≥ 1"),
  image_urls: z.string().optional(),
})

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-green-100 text-green-800",
  Occupied: "bg-blue-100 text-blue-800",
  Cleaning: "bg-yellow-100 text-yellow-800",
  Maintenance: "bg-red-100 text-red-800",
  Cleaned: "bg-purple-100 text-purple-800",
}

export const RoomsPage: React.FC = () => {
  const { toastSuccess, toastError } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [page, setPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Modal states
  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null)
  const [createTypeOpen, setCreateTypeOpen] = useState(false)

  // Forms
  const createForm = useForm<RoomCreate>({ resolver: zodResolver(roomCreateSchema) })
  const editForm = useForm<RoomUpdate>({ resolver: zodResolver(roomUpdateSchema) })
  const typeForm = useForm<any>({ resolver: zodResolver(roomTypeSchema) })

  const fetchData = async (currentPage = page) => {
    setLoading(true)
    const skip = (currentPage - 1) * itemsPerPage
    try {
      const [roomsRes, typesRes] = await Promise.all([
        api.get<Room[]>("/rooms", { params: { skip, limit: itemsPerPage } }),
        api.get<RoomType[]>("/room-types"),
      ])
      setRooms(roomsRes.data)
      setTotalItems(parseInt(roomsRes.headers["x-total-count"] || "0", 10))
      setRoomTypes(typesRes.data)
    } catch {
      toastError("Failed to load rooms data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(1)
  }, [])

  // Apply filters and sort rooms by number (ascending)
  const filtered = rooms
    .filter((r) => {
      const matchSearch =
        !search ||
        r.room_number.toLowerCase().includes(search.toLowerCase()) ||
        r.room_type.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = !filterStatus || r.status === filterStatus
      return matchSearch && matchStatus
    })
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))

  const onPageChange = (newPage: number) => {
    setPage(newPage)
    fetchData(newPage)
  }

  // Create Room
  const onCreateRoom = async (data: RoomCreate) => {
    try {
      await api.post("/rooms", data)
      toastSuccess("Room created successfully!")
      setCreateRoomOpen(false)
      createForm.reset()
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to create room.")
    }
  }

  // Edit Room
  const openEdit = (room: Room) => {
    setEditRoom(room)
    editForm.reset({
      room_number: room.room_number,
      floor: room.floor,
      status: room.status,
      notes: room.notes ?? "",
      room_type_id: room.room_type.id,
    })
  }

  const onEditRoom = async (data: RoomUpdate) => {
    if (!editRoom) return
    try {
      await api.put(`/rooms/${editRoom.id}`, data)
      toastSuccess("Room updated successfully!")
      setEditRoom(null)
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update room.")
    }
  }

  // Delete Room
  const onDeleteRoom = async () => {
    if (!deleteRoom) return
    try {
      await api.delete(`/rooms/${deleteRoom.id}`)
      toastSuccess("Room deleted.")
      setDeleteRoom(null)
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to delete room.")
    }
  }

  const markAvailable = async (room: Room) => {
    try {
      await api.patch(`/rooms/${room.id}/mark-available`)
      toastSuccess(`Room ${room.room_number} marked as Available.`)
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update room.")
    }
  }

  // Create Room Type
  const onCreateType = async (data: any) => {
    try {
      const payload: RoomTypeCreate = {
        ...data,
        image_urls: data.image_urls
          ? data.image_urls.split(",").map((u: string) => u.trim()).filter(Boolean)
          : [],
      }
      await api.post("/room-types", payload)
      toastSuccess("Room type created!")
      setCreateTypeOpen(false)
      typeForm.reset()
      fetchData()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to create room type.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b pb-4">
        <div>
          <h2 className="text-3xl font-serif tracking-wide flex items-center gap-2">
            <BedDouble className="h-7 w-7 text-primary" /> Rooms Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalItems} total rooms · {roomTypes.length} room types
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCreateTypeOpen(true)}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Tag className="h-4 w-4" /> Add Room Type
          </button>
          <button
            onClick={() => setCreateRoomOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Room
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {["Available", "Occupied", "Cleaning", "Maintenance", "Cleaned"].map((s) => (
          <div key={s} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">{s}</p>
            <p className="text-2xl font-bold mt-1">
              {rooms.filter((r) => r.status === s).length}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); fetchData(1) }}
            placeholder="Search by room number or type..."
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); fetchData(1) }}
            className="rounded-lg border bg-card py-2 pl-9 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
          >
            <option value="">All Statuses</option>
            <option>Available</option>
            <option>Occupied</option>
            <option>Cleaning</option>
            <option>Cleaned</option>
            <option>Maintenance</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <button onClick={() => fetchData()} className="rounded-lg border p-2 hover:bg-secondary transition-colors" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No rooms found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-5 py-3">Room #</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Floor</th>
                  <th className="px-5 py-3">Price/Night</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => (
                  <tr key={room.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3.5 font-bold">{room.room_number}</td>
                    <td className="px-5 py-3.5">{room.room_type.name}</td>
                    <td className="px-5 py-3.5">{room.floor}</td>
                    <td className="px-5 py-3.5">TK {room.room_type.base_price_per_night.toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_COLORS[room.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        {room.status === "Cleaned" && (
                          <button
                            onClick={() => markAvailable(room)}
                            className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
                            title="Mark room as available"
                          >
                            <Sparkles className="h-3 w-3" /> Mark Available
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(room)}
                          className="rounded-lg border p-1.5 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteRoom(room)}
                          className="rounded-lg border p-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalItems > itemsPerPage && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={onPageChange}
          />
        )}
      </div>

      {/* Create Room Modal */}
      <Modal isOpen={createRoomOpen} title="Add New Room" onClose={() => { setCreateRoomOpen(false); createForm.reset() }}>
        <form onSubmit={createForm.handleSubmit(onCreateRoom)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Room Number</label>
              <input {...createForm.register("room_number")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. 101" />
              {createForm.formState.errors.room_number && <p className="text-[10px] text-destructive">{createForm.formState.errors.room_number.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Floor</label>
              <input {...createForm.register("floor")} type="number" className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="1" />
              {createForm.formState.errors.floor && <p className="text-[10px] text-destructive">{createForm.formState.errors.floor.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Room Type</label>
            <select {...createForm.register("room_type_id")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select a type...</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name} — TK {rt.base_price_per_night}/night</option>
              ))}
            </select>
            {createForm.formState.errors.room_type_id && <p className="text-[10px] text-destructive">{createForm.formState.errors.room_type_id.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Notes (optional)</label>
            <textarea {...createForm.register("notes")} rows={2} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setCreateRoomOpen(false); createForm.reset() }} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={createForm.formState.isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {createForm.formState.isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Room
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Room Modal */}
      <Modal isOpen={!!editRoom} title={`Edit Room ${editRoom?.room_number}`} onClose={() => setEditRoom(null)}>
        <form onSubmit={editForm.handleSubmit(onEditRoom)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Room Number</label>
              <input {...editForm.register("room_number")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Floor</label>
              <input {...editForm.register("floor")} type="number" className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <select {...editForm.register("status")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option>Available</option>
                <option>Occupied</option>
                <option>Cleaning</option>
                <option>Cleaned</option>
                <option>Maintenance</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Room Type</label>
              <select {...editForm.register("room_type_id")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Notes</label>
            <textarea {...editForm.register("notes")} rows={2} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditRoom(null)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={editForm.formState.isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {editForm.formState.isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Room Type Modal */}
      <Modal isOpen={createTypeOpen} title="Add Room Type" onClose={() => { setCreateTypeOpen(false); typeForm.reset() }}>
        <form onSubmit={typeForm.handleSubmit(onCreateType)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Type Name</label>
            <input {...typeForm.register("name")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Deluxe Suite" />
            {typeForm.formState.errors.name && <p className="text-[10px] text-destructive">{String(typeForm.formState.errors.name.message || "")}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Price / Night (TK)</label>
              <input {...typeForm.register("base_price_per_night")} type="number" step="0.01" className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {typeForm.formState.errors.base_price_per_night && <p className="text-[10px] text-destructive">{String(typeForm.formState.errors.base_price_per_night.message || "")}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Max Occupancy</label>
              <input {...typeForm.register("max_occupancy")} type="number" className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {typeForm.formState.errors.max_occupancy && <p className="text-[10px] text-destructive">{String(typeForm.formState.errors.max_occupancy.message || "")}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Description (optional)</label>
            <textarea {...typeForm.register("description")} rows={2} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Image URLs (comma-separated, optional)</label>
            <input {...typeForm.register("image_urls")} className="block w-full rounded-lg border bg-card py-2 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="https://images.unsplash.com/photo-..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setCreateTypeOpen(false); typeForm.reset() }} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={typeForm.formState.isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {typeForm.formState.isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Type
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteRoom}
        title="Delete Room"
        message={`Are you sure you want to delete Room ${deleteRoom?.room_number}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={onDeleteRoom}
        onCancel={() => setDeleteRoom(null)}
        danger
      />
    </div>
  )
}
