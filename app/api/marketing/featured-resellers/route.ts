import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const resellers = await prisma.reseller.findMany({
      where: { isFeatured: true, isActive: true },
      select: {
        id: true,
        companyName: true,
        customLogoUrl: true,
        customDomain: true,
      },
      orderBy: { companyName: "asc" },
      take: 24,
    });

    return NextResponse.json(resellers);
  } catch (error) {
    console.error("Failed to fetch featured resellers", error);
    return NextResponse.json({ error: "Failed to fetch featured resellers" }, { status: 500 });
  }
}
