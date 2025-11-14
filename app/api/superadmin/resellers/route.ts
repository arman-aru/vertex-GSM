import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const resellers = await prisma.reseller.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyName: true,
        email: true,
        isActive: true,
        isFeatured: true,
        createdAt: true,
        customDomain: true,
        _count: {
          select: {
            users: true,
            orders: true,
            licenses: true,
          },
        },
      },
    });
    return NextResponse.json({ resellers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load resellers" }, { status: 500 });
  }
}
