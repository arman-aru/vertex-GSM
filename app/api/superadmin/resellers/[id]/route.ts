import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const reseller = await prisma.reseller.findUnique({
      where: { id: params.id },
      include: {
        users: { select: { id: true, email: true, name: true, isActive: true, createdAt: true } },
        licenses: true,
        orders: { select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true }, take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    if (!reseller) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(reseller);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load reseller" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { isActive, isFeatured } = body;
    const updated = await prisma.reseller.update({
      where: { id: params.id },
      data: {
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(typeof isFeatured === "boolean" ? { isFeatured } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update reseller" }, { status: 500 });
  }
}
