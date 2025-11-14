"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Building2, RefreshCw, Eye, CheckCircle, Key, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Reseller {
  id: string;
  companyName: string;
  email: string;
  createdAt: string;
  isActive: boolean;
  isFeatured: boolean;
  customDomain: string | null;
  _count: { users: number; orders: number; licenses: number };
}

interface ResellerDetails extends Reseller {
  users: Array<{ id: string; email: string; name: string | null; isActive: boolean; createdAt: string }>;
  licenses: Array<{ id: string; key: string; status: string; createdAt: string }>;
  orders: Array<{ id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string }>;
}

export default function SuperadminResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ResellerDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/resellers");
      if (!res.ok) throw new Error("Failed to fetch resellers");
      const data = await res.json();
      let list: Reseller[] = data.resellers;
      if (searchQuery) {
        list = list.filter(r => r.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || r.email.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      setResellers(list);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load resellers");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/superadmin/resellers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch reseller details");
      const data = await res.json();
      setSelected(data);
      setDialogOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const approveReseller = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/superadmin/resellers/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error("Failed to approve reseller");
      toast.success("Reseller approved");
      fetchDetails(selected.id);
      fetchResellers();
    } catch (e) {
      console.error(e);
      toast.error("Approval failed");
    }
  };

  const generateLicense = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/superadmin/licenses/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resellerId: selected.id }),
      });
      if (!res.ok) throw new Error("Failed to generate license");
      const data = await res.json();
      toast.success(`License created: ${data.key}`);
      fetchDetails(selected.id);
    } catch (e) {
      console.error(e);
      toast.error("License generation failed");
    }
  };

  const handleSearch = () => {
    fetchResellers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Resellers</h2>
          <p className="text-muted-foreground">Manage platform reseller accounts</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Resellers</CardTitle>
          <CardDescription>Filter by company or email</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon"><Search className="h-4 w-4" /></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Resellers ({resellers.length})</CardTitle>
          <CardDescription>All registered reseller accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Licenses</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No resellers found</TableCell>
                </TableRow>
              ) : resellers.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.companyName}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{r._count.users}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r._count.orders}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{r._count.licenses}</Badge></TableCell>
                  <TableCell className="text-xs">{r.customDomain || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "Active" : "Pending"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => fetchDetails(r.id)} disabled={loadingDetails}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[750px]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.companyName}</DialogTitle>
                <DialogDescription>Reseller details & management</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Company</Label>
                    <div className="text-sm font-medium">{selected.companyName}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <div className="text-sm">{selected.email}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Domain</Label>
                    <div className="text-sm">{selected.customDomain || "—"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Badge variant={selected.isActive ? "default" : "secondary"}>{selected.isActive ? "Active" : "Pending"}</Badge>
                  </div>
                  <div className="space-y-1">
                    <Label>Users</Label>
                    <div className="text-sm">{selected._count.users}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Orders</Label>
                    <div className="text-sm">{selected._count.orders}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Licenses</Label>
                    <div className="text-sm">{selected._count.licenses}</div>
                  </div>
                  <div className="space-y-1">
                    <Label>Featured</Label>
                    <Badge variant={selected.isFeatured ? "default" : "outline"}>{selected.isFeatured ? "Yes" : "No"}</Badge>
                  </div>
                </div>

                {/* Users list */}
                <div className="space-y-2 border-t pt-4">
                  <Label>Recent Users</Label>
                  <div className="max-h-[180px] overflow-y-auto text-xs">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.users.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center">No users</TableCell></TableRow>
                        ) : selected.users.map(u => (
                          <TableRow key={u.id}>
                            <TableCell className="font-mono">{u.email}</TableCell>
                            <TableCell>{u.name || "—"}</TableCell>
                            <TableCell><Badge variant={u.isActive ? "outline" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                            <TableCell>{format(new Date(u.createdAt), "MMM dd, yyyy")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Licenses */}
                <div className="space-y-2 border-t pt-4">
                  <Label>Licenses</Label>
                  <div className="max-h-[140px] overflow-y-auto text-xs">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.licenses.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center">No licenses</TableCell></TableRow>
                        ) : selected.licenses.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono">{l.key}</TableCell>
                            <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                            <TableCell>{format(new Date(l.createdAt), "MMM dd, yyyy")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Orders */}
                <div className="space-y-2 border-t pt-4">
                  <Label>Recent Orders</Label>
                  <div className="max-h-[140px] overflow-y-auto text-xs">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.orders.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center">No orders</TableCell></TableRow>
                        ) : selected.orders.map(o => (
                          <TableRow key={o.id}>
                            <TableCell className="font-mono">{o.orderNumber}</TableCell>
                            <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                            <TableCell>${o.totalAmount.toFixed(2)}</TableCell>
                            <TableCell>{format(new Date(o.createdAt), "MMM dd, yyyy")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  {!selected.isActive && (
                    <Button onClick={approveReseller} variant="default" className="gap-2"><CheckCircle className="h-4 w-4" /> Approve</Button>
                  )}
                  <Button onClick={generateLicense} variant="secondary" className="gap-2"><Key className="h-4 w-4" /> Generate License</Button>
                </div>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
