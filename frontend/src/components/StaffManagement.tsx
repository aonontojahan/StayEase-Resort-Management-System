import React, { useEffect, useState } from "react"
import { useAuth } from "@/store/AuthContext"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/services/api"
import { Loader2, Plus, Users } from "lucide-react"

const userSchema = z.object({
  email: z.string().email("Invalid email"),
  full_name: z.string().min(2, "Name too short"),
  phone_number: z.string().optional(),
  password: z.string().min(6, "Minimum 6 characters"),
  role_name: z.string().min(1, "Role is required"),
})

type UserFormValues = z.infer<typeof userSchema>

export const StaffManagement: React.FC = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      full_name: "",
      phone_number: "",
      password: "",
      role_name: ""
    }
  })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get("/auth/users")
      setUsers(res.data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const onSubmit = async (data: UserFormValues) => {
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      await api.post("/auth/users", data)
      setSuccessMsg("User created successfully!")
      reset()
      fetchUsers()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to create user.")
    }
  }

  const roleOptions = user?.role.name === "Resort Owner" 
    ? ["Manager", "Receptionist", "Housekeeping", "Accountant", "Guest"]
    : ["Receptionist", "Housekeeping", "Accountant", "Guest"]

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><Plus className="h-5 w-5"/> Create User</h3>
          <p className="text-sm text-muted-foreground">Add new staff or guests.</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {successMsg && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-700">{successMsg}</div>}
          {errorMsg && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">{errorMsg}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
              <input {...register("full_name")} className="block w-full rounded-lg border bg-card py-2 px-3 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {errors.full_name && <p className="text-[10px] text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <input {...register("email")} type="email" className="block w-full rounded-lg border bg-card py-2 px-3 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Phone</label>
              <input {...register("phone_number")} className="block w-full rounded-lg border bg-card py-2 px-3 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <input {...register("password")} type="password" className="block w-full rounded-lg border bg-card py-2 px-3 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {errors.password && <p className="text-[10px] text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Role</label>
              <select {...register("role_name")} className="block w-full rounded-lg border bg-card py-2 px-3 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Select a role...</option>
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.role_name && <p className="text-[10px] text-destructive">{errors.role_name.message}</p>}
            </div>
          </div>
          
          <button type="submit" disabled={isSubmitting} className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : "Create User"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <h3 className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5"/> Existing Users</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground"/></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{u.full_name}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{u.role.name}</span></td>
                    <td className="px-6 py-4">{u.is_active ? <span className="text-green-600 font-medium">Active</span> : <span className="text-destructive font-medium">Inactive</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
