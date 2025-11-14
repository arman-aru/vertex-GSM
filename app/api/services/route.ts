import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all enabled services for the user's reseller
    const services = await prisma.managedService.findMany({
      where: {
        resellerId: session.user.resellerId,
        isEnabled: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        serviceType: true,
        ourPrice: true,
        deliveryTime: true,
        minQuantity: true,
        maxQuantity: true,
      },
      orderBy: {
        category: "asc",
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
