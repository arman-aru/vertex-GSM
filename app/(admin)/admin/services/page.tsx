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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RefreshCw, DollarSign, Edit, Package } from "lucide-react"
import { toast } from "sonner"

interface Supplier {
  id: string
  name: string
  isActive: boolean
}

interface ManagedService {
  id: string
  supplierServiceId: string
  name: string
  description: string | null
  category: string | null
  supplierPrice: number
  ourPrice: number
  isEnabled: boolean
  deliveryTime: string | null
  supplier: Supplier
}

export default function ServicesPage() {
  const [services, setServices] = useState<ManagedService[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [editingService, setEditingService] = useState<ManagedService | null>(null)
  const [editPrice, setEditPrice] = useState("")

  useEffect(() => {
    fetchServices()
    fetchSuppliers()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/admin/services")
      if (!response.ok) throw new Error("Failed to fetch services")
      const data = await response.json()
      setServices(data)
    } catch (error) {
      console.error("Error fetching services:", error)
      toast.error("Failed to load services")
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/admin/suppliers")
      if (!response.ok) throw new Error("Failed to fetch suppliers")
      const data = await response.json()
      setSuppliers(data)
    } catch (error) {
      console.error("Error fetching suppliers:", error)
    }
  }

  const handleSyncServices = async () => {
    if (!selectedSupplier) {
      toast.error("Please select a supplier")
      return
    }

    setSyncing(true)
    try {
      const response = await fetch("/api/admin/services/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: selectedSupplier }),
      })

      if (!response.ok) throw new Error("Failed to sync services")

      const data = await response.json()
      toast.success(data.message)
      fetchServices()
    } catch (error) {
      console.error("Error syncing services:", error)
      toast.error("Failed to sync services from supplier")
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleService = async (service: ManagedService) => {
    try {
      const response = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !service.isEnabled }),
      })

      if (!response.ok) throw new Error("Failed to update service")

      toast.success(`Service ${!service.isEnabled ? "enabled" : "disabled"}`)
      fetchServices()
    } catch (error) {
      console.error("Error toggling service:", error)
      toast.error("Failed to update service")
    }
  }

  const handleUpdatePrice = async () => {
    if (!editingService) return

    const newPrice = parseFloat(editPrice)
    if (isNaN(newPrice) || newPrice <= editingService.supplierPrice) {
      toast.error("Price must be greater than supplier price")
      return
    }

    try {
      const response = await fetch(`/api/admin/services/${editingService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ourPrice: newPrice }),
      })

      if (!response.ok) throw new Error("Failed to update price")

      toast.success("Price updated successfully")
      setEditingService(null)
      setEditPrice("")
      fetchServices()
    } catch (error) {
      console.error("Error updating price:", error)
      toast.error("Failed to update price")
    }
  }

  const calculateMargin = (service: ManagedService) => {
    const margin = service.ourPrice - service.supplierPrice
    const percentage = (margin / service.supplierPrice) * 100
    return { margin, percentage }
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
          <h2 className="text-3xl font-bold tracking-tight">Managed Services</h2>
          <p className="text-muted-foreground">
            Configure pricing and availability for your services
          </p>
        </div>
      </div>

      {/* Sync Services Section */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Services from Supplier</CardTitle>
          <CardDescription>
            Import the latest services from your DHRU supplier
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSyncServices} disabled={syncing || !selectedSupplier}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Services"}
          </Button>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Available Services ({services.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Your Price</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No services available. Sync services from a supplier to get started.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => {
                  const { margin, percentage } = calculateMargin(service)
                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.category || "General"}</Badge>
                      </TableCell>
                      <TableCell>{service.supplier.name}</TableCell>
                      <TableCell>${service.supplierPrice.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">
                        ${service.ourPrice.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">
                          +${margin.toFixed(2)} ({percentage.toFixed(0)}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={service.isEnabled}
                          onCheckedChange={() => handleToggleService(service)}
                        />
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingService(service)
                                setEditPrice(service.ourPrice.toString())
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Service Price</DialogTitle>
                              <DialogDescription>
                                Update the selling price for {service.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Supplier Cost Price</Label>
                                <div className="text-sm text-muted-foreground">
                                  ${service.supplierPrice.toFixed(2)}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="price">Your Selling Price</Label>
                                <div className="flex gap-2">
                                  <DollarSign className="h-4 w-4 mt-3 text-muted-foreground" />
                                  <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min={service.supplierPrice}
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                  />
                                </div>
                                {parseFloat(editPrice) > service.supplierPrice && (
                                  <div className="text-sm text-green-600">
                                    Margin: $
                                    {(parseFloat(editPrice) - service.supplierPrice).toFixed(2)} (
                                    {(
                                      ((parseFloat(editPrice) - service.supplierPrice) /
                                        service.supplierPrice) *
                                      100
                                    ).toFixed(0)}
                                    %)
                                  </div>
                                )}
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleUpdatePrice}>Update Price</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
