"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { RefreshCw, Search, ShoppingCart, Eye } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
  transactions: Array<{
    status: string
    amount: number
  }>
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  REFUNDED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        ...(searchQuery && { search: searchQuery }),
      })
      
      const response = await fetch(`/api/admin/orders?${params}`)
      if (!response.ok) throw new Error("Failed to fetch orders")
      
      const data = await response.json()
      setOrders(data.orders)
      setTotal(data.total)
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setLoading(true)
    fetchOrders()
  }

  const getPaymentStatus = (order: Order) => {
    const paidTransaction = order.transactions.find(t => t.status === "paid")
    return paidTransaction ? "Paid" : "Unpaid"
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
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            Manage all orders from your customers
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search by order number, email, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Orders ({total})
          </CardTitle>
          <CardDescription>
            View and manage all customer orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.user.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), "HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {order.currency} ${order.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          getPaymentStatus(order) === "Paid" ? "default" : "outline"
                        }
                      >
                        {getPaymentStatus(order)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[order.status] || ""}
                        variant="outline"
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
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
