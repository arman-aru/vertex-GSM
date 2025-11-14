import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Mock DHRU API response - In Phase 5, this will be replaced with actual API call
async function fetchDHRUServices(supplier: { apiUrl: string; username: string; apiKey: string }) {
  // TODO: Phase 5 - Implement actual DHRU API integration
  // For now, return mock data
  return [
    {
      serviceId: "1001",
      name: "iPhone 15 Pro IMEI Check",
      category: "IMEI Services",
      price: 0.50,
      description: "Check iPhone 15 Pro IMEI status",
      deliveryTime: "Instant",
    },
    {
      serviceId: "1002",
      name: "Samsung Galaxy S24 Unlock",
      category: "Unlock Services",
      price: 5.00,
      description: "Unlock Samsung Galaxy S24 all carriers",
      deliveryTime: "1-3 hours",
    },
    {
      serviceId: "1003",
      name: "Google FRP Removal",
      category: "FRP Services",
      price: 3.00,
      description: "Remove Google FRP lock on Android devices",
      deliveryTime: "Instant",
    },
  ]
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resellerId = session.user.resellerId
    const { supplierId } = await req.json()

    // Get supplier details
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
        resellerId,
        isActive: true,
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    // Fetch services from DHRU API
    const dhruServices = await fetchDHRUServices({
      apiUrl: supplier.apiUrl,
      username: supplier.username,
      apiKey: supplier.apiKey,
    })

    // Sync services to database
    const syncedServices = []
    for (const dhruService of dhruServices) {
      // Check if service already exists
      const existing = await prisma.managedService.findFirst({
        where: {
          resellerId,
          supplierServiceId: dhruService.serviceId,
          supplierId,
        },
      })

      if (existing) {
        // Update existing service
        const updated = await prisma.managedService.update({
          where: { id: existing.id },
          data: {
            name: dhruService.name,
            description: dhruService.description,
            category: dhruService.category,
            supplierPrice: dhruService.price,
            deliveryTime: dhruService.deliveryTime,
            metadata: dhruService,
          },
          include: {
            supplier: true,
          },
        })
        syncedServices.push(updated)
      } else {
        // Create new service with 30% markup as default
        const markup = dhruService.price * 0.3
        const created = await prisma.managedService.create({
          data: {
            resellerId,
            supplierId,
            supplierServiceId: dhruService.serviceId,
            name: dhruService.name,
            description: dhruService.description,
            category: dhruService.category,
            supplierPrice: dhruService.price,
            ourPrice: dhruService.price + markup,
            deliveryTime: dhruService.deliveryTime,
            isEnabled: false, // Disabled by default until admin reviews
            metadata: dhruService,
          },
          include: {
            supplier: true,
          },
        })
        syncedServices.push(created)
      }
    }

    return NextResponse.json({
      message: `Successfully synced ${syncedServices.length} services`,
      services: syncedServices,
    })
  } catch (error) {
    console.error("Error syncing services:", error)
    return NextResponse.json(
      { error: "Failed to sync services from supplier" },
      { status: 500 }
    )
  }
}
