"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "@/components/ui/dialog"
import { RefreshCw, Search, Users as UsersIcon, Eye, Plus, Minus, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface User {
  id: string
  email: string
  name: string | null
  balance: number
  isActive: boolean
  createdAt: string
  _count: {
    orders: number
  }
}

interface UserDetails extends User {
  orders: Array<{
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    createdAt: string
  }>
  totalSpent: number
  _count: {
    orders: number
    supportTickets: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [total, setTotal] = useState(0)
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [balanceAmount, setBalanceAmount] = useState("")

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
      })
      
      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error("Failed to fetch users")
      
      const data = await response.json()
      setUsers(data.users)
      setTotal(data.total)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) throw new Error("Failed to fetch user details")
      
      const data = await response.json()
      setSelectedUser(data)
      setDialogOpen(true)
    } catch (error) {
      console.error("Error fetching user details:", error)
      toast.error("Failed to load user details")
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSearch = () => {
    setLoading(true)
    fetchUsers()
  }

  const handleUpdateBalance = async (operation: "add" | "subtract") => {
    if (!selectedUser || !balanceAmount) {
      toast.error("Please enter an amount")
      return
    }

    const amount = parseFloat(balanceAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const newBalance = operation === "add" 
      ? selectedUser.balance + amount 
      : selectedUser.balance - amount

    if (newBalance < 0) {
      toast.error("Balance cannot be negative")
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: newBalance }),
      })

      if (!response.ok) throw new Error("Failed to update balance")

      toast.success(`Balance ${operation === "add" ? "added" : "subtracted"} successfully`)
      setBalanceAmount("")
      fetchUserDetails(selectedUser.id)
      fetchUsers()
    } catch (error) {
      console.error("Error updating balance:", error)
      toast.error("Failed to update balance")
    }
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
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            Manage your end-user customers
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Customers</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Customers ({total})
          </CardTitle>
          <CardDescription>
            View and manage customer accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        {user.balance.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user._count.orders} orders</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchUserDetails(user.id)}
                        disabled={loadingDetails}
                      >
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

      {/* User Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>Customer Details</DialogTitle>
                <DialogDescription>
                  View and manage customer information
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <div className="text-sm font-medium">{selectedUser.name || "N/A"}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="text-sm font-medium">{selectedUser.email}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Balance</Label>
                    <div className="text-lg font-bold text-green-600">
                      ${selectedUser.balance.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Spent</Label>
                    <div className="text-lg font-bold">
                      ${selectedUser.totalSpent.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Orders</Label>
                    <div className="text-sm font-medium">{selectedUser._count.orders}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Support Tickets</Label>
                    <div className="text-sm font-medium">{selectedUser._count.supportTickets}</div>
                  </div>
                </div>

                {/* Balance Management */}
                <div className="space-y-4 border-t pt-4">
                  <Label>Manage Balance</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter amount"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                    />
                    <Button onClick={() => handleUpdateBalance("add")} variant="default">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                    <Button onClick={() => handleUpdateBalance("subtract")} variant="destructive">
                      <Minus className="h-4 w-4 mr-2" />
                      Subtract
                    </Button>
                  </div>
                </div>

                {/* Order History */}
                <div className="space-y-4 border-t pt-4">
                  <Label>Recent Orders</Label>
                  <div className="max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUser.orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                              No orders yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedUser.orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-xs">
                                {order.orderNumber}
                              </TableCell>
                              <TableCell className="text-xs">
                                {format(new Date(order.createdAt), "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell className="text-xs">
                                ${order.totalAmount.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {order.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
