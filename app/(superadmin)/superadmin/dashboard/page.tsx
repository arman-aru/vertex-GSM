import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Building2, Users, DollarSign } from "lucide-react";

async function getMetrics() {
  const [resellerCount, userCount, paidRevenueRaw, activeSupplierCount] = await Promise.all([
    prisma.reseller.count(),
    prisma.user.count(),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: { equals: "paid" } },
    }),
    prisma.supplier.count({ where: { isActive: true } }),
  ]);

  const totalRevenue = paidRevenueRaw._sum.amount || 0;

  // Simple API health heuristic: DB accessible & at least one active supplier
  const apiHealth = activeSupplierCount > 0 ? "Healthy" : "No Active Suppliers";

  return { resellerCount, userCount, totalRevenue, apiHealth };
}

export default async function SuperAdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const metrics = await getMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Superadmin Dashboard</h1>
        <p className="text-muted-foreground text-sm">System-wide analytics and platform health overview.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resellers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.resellerCount}</div>
            <p className="text-xs text-muted-foreground">Registered businesses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SaaS Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Sum of paid transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.userCount}</div>
            <p className="text-xs text-muted-foreground">Across all resellers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Health Status</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.apiHealth}</div>
            <p className="text-xs text-muted-foreground">Suppliers & DB connectivity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
