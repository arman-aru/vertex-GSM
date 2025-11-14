"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  ShoppingCart,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your services and orders from your dashboard
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/services">
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Account Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${session?.user?.balance?.toFixed(2) || "0.00"}
            </div>
            <Button variant="link" className="px-0 h-auto mt-2" asChild>
              <Link href="/dashboard/account">
                Add funds <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500 mt-2">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500 mt-2">Processing orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500 mt-2">Successful orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="/dashboard/services">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Browse Services
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="/dashboard/orders">
              <Clock className="mr-2 h-5 w-5" />
              View Orders
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start" asChild>
            <Link href="/dashboard/support">
              <Plus className="mr-2 h-5 w-5" />
              Get Support
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Orders (Empty State) */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No orders yet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Start by browsing our services and placing your first order
            </p>
            <Button asChild>
              <Link href="/dashboard/services">Browse Services</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
