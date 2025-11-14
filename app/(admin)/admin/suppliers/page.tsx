"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Server, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Supplier {
  id: string
  name: string
  apiUrl: string
  username: string
  apiKey: string
  isActive: boolean
  priority: number
  createdAt: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    apiUrl: "",
    username: "",
    apiKey: "",
    priority: 0,
    isActive: true,
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/admin/suppliers")
      if (!response.ok) throw new Error("Failed to fetch suppliers")
      const data = await response.json()
      setSuppliers(data)
    } catch (error) {
      console.error("Error fetching suppliers:", error)
      toast.error("Failed to load suppliers")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingSupplier
        ? `/api/admin/suppliers/${editingSupplier.id}`
        : "/api/admin/suppliers"
      
      const response = await fetch(url, {
        method: editingSupplier ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to save supplier")

      toast.success(
        editingSupplier ? "Supplier updated successfully" : "Supplier added successfully"
      )
      setDialogOpen(false)
      resetForm()
      fetchSuppliers()
    } catch (error) {
      console.error("Error saving supplier:", error)
      toast.error("Failed to save supplier")
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      apiUrl: supplier.apiUrl,
      username: supplier.username,
      apiKey: supplier.apiKey,
      priority: supplier.priority,
      isActive: supplier.isActive,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return

    try {
      const response = await fetch(`/api/admin/suppliers/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete supplier")
      }

      toast.success("Supplier deleted successfully")
      fetchSuppliers()
    } catch (error: any) {
      console.error("Error deleting supplier:", error)
      toast.error(error.message || "Failed to delete supplier")
    }
  }

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      const response = await fetch(`/api/admin/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      })

      if (!response.ok) throw new Error("Failed to update supplier")

      toast.success(`Supplier ${!supplier.isActive ? "activated" : "deactivated"}`)
      fetchSuppliers()
    } catch (error) {
      console.error("Error toggling supplier:", error)
      toast.error("Failed to update supplier")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      apiUrl: "",
      username: "",
      apiKey: "",
      priority: 0,
      isActive: true,
    })
    setEditingSupplier(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
          <p className="text-muted-foreground">
            Manage your DHRU API suppliers and their credentials
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                </DialogTitle>
                <DialogDescription>
                  Configure the DHRU API credentials for your supplier
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Supplier Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., DHRU Supplier 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">API URL</Label>
                  <Input
                    id="apiUrl"
                    value={formData.apiUrl}
                    onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                    placeholder="https://api.dhru.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Your API username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Your API key"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (0-100)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher priority suppliers are preferred for routing
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingSupplier ? "Update Supplier" : "Add Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Active Suppliers ({suppliers.length})
          </CardTitle>
          <CardDescription>
            Configure multiple suppliers and choose which one to use for each service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API URL</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No suppliers configured. Add your first supplier to get started.
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="font-mono text-sm">{supplier.apiUrl}</TableCell>
                    <TableCell>{supplier.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{supplier.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={supplier.isActive}
                        onCheckedChange={() => handleToggleActive(supplier)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
