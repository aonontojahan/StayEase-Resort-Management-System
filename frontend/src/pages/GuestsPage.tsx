import React, { useEffect, useState } from "react"
import { api } from "@/services/api"
import { User } from "@/types/auth"
import { TableSkeleton } from "@/components/Skeleton"
import { useToast } from "@/components/Toast"
import { Users, Loader2, Search, RefreshCw, UserCheck, UserX, Trash2, UserMinus, UserPlus, ChevronDown } from "lucide-react"
import { useAuth } from "@/store/AuthContext"
import { ConfirmModal } from "@/components/Modal"
import { Badge } from "@/components/ui/Badge"
import { EmptyState } from "@/components/ui/EmptyState"

const ALL_ROLES = ["Resort Owner", "Manager", "Receptionist", "Housekeeping", "Accountant", "Guest"]

export const GuestsPage: React.FC = () => {
  const { toastError, toastSuccess } = useToast()
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get<User[]>("/auth/users")
      setUsers(res.data)
    } catch {
      toastError("Failed to load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const roles = [...new Set(users.map((u) => u.role.name))]

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !filterRole || u.role.name === filterRole
    return matchSearch && matchRole
  })

  const toggleActive = async (u: User) => {
    try {
      const endpoint = u.is_active ? "deactivate" : "activate"
      await api.patch(`/auth/users/${u.id}/${endpoint}`)
      toastSuccess(`${u.full_name} ${u.is_active ? "deactivated" : "activated"}.`)
      fetchUsers()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to update user.")
    }
  }

  const onChangeRole = async (targetUser: User, newRole: string) => {
    if (newRole === targetUser.role.name) {
      setEditingRole(null)
      return
    }
    setChangingRole(targetUser.id)
    try {
      await api.patch(`/auth/users/${targetUser.id}/role`, { role_name: newRole })
      toastSuccess(`${targetUser.full_name} role changed to ${newRole}.`)
      setEditingRole(null)
      fetchUsers()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to change role.")
    } finally {
      setChangingRole(null)
    }
  }

  const onDeleteUser = async () => {
    if (!deleteUser) return
    setDeleting(true)
    try {
      await api.delete(`/auth/users/${deleteUser.id}`)
      toastSuccess(`User ${deleteUser.full_name} deleted.`)
      setDeleteUser(null)
      fetchUsers()
    } catch (err: any) {
      toastError(err.response?.data?.detail || "Failed to delete user.")
    } finally {
      setDeleting(false)
    }
  }

  const ROLE_COLORS: Record<string, string> = {
    "Resort Owner": "bg-purple-100 text-purple-800",
    Manager: "bg-blue-100 text-blue-800",
    Receptionist: "bg-cyan-100 text-cyan-800",
    Housekeeping: "bg-green-100 text-green-800",
    Accountant: "bg-orange-100 text-orange-800",
    Guest: "bg-gray-100 text-gray-700",
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> All Users
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} total users across all roles</p>
        </div>
        <button onClick={fetchUsers} className="rounded-lg border p-2 hover:bg-secondary transition-colors w-fit" title="Refresh">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Role stats */}
      <div className="flex flex-wrap gap-3">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => setFilterRole(filterRole === r ? "" : r)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
              filterRole === r
                ? (ROLE_COLORS[r] || "bg-gray-100 text-gray-700") + " border-transparent"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {r}
            <span className="font-bold">{users.filter((u) => u.role.name === r).length}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-10 w-10" />} title="No users found" description="Try adjusting your search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{u.phone_number || "—"}</td>
                    <td className="px-5 py-3.5">
                      {editingRole === u.id ? (
                        <div className="relative inline-flex">
                          <select
                            value={u.role.name}
                            disabled={changingRole === u.id}
                            onChange={(e) => onChangeRole(u, e.target.value)}
                            onBlur={() => setEditingRole(null)}
                            autoFocus
                            className="rounded-lg border bg-card py-1 pl-2 pr-7 text-xs font-semibold appearance-none cursor-pointer focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                          >
                            {ALL_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          {changingRole === u.id && <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />}
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingRole(u.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all ${ROLE_COLORS[u.role.name] || "bg-gray-100 text-gray-700"}`}
                          title="Click to change role"
                        >
                          {u.role.name}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.is_active ? (
                        <Badge variant="success">
                          <UserCheck className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="neutral">
                          <UserX className="h-3 w-3 mr-1" /> Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(u)}
                          className={`rounded-lg border p-1.5 text-xs transition-colors ${
                            u.is_active
                              ? "text-red-600 hover:bg-red-50 border-red-200"
                              : "text-green-600 hover:bg-green-50 border-green-200"
                          }`}
                          title={u.is_active ? "Deactivate user" : "Activate user"}
                        >
                          {u.is_active ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeleteUser(u)}
                          disabled={u.id === user?.id}
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                          title="Delete user"
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
      </div>

      <ConfirmModal
        isOpen={!!deleteUser}
        title="Delete User"
        message={`Delete ${deleteUser?.full_name} (${deleteUser?.email})? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={onDeleteUser}
        onCancel={() => setDeleteUser(null)}
        danger
        loading={deleting}
      />
    </div>
  )
}
