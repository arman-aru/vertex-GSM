import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { resellerId } = await req.json();
    if (!resellerId) return NextResponse.json({ error: "resellerId required" }, { status: 400 });

    const key = "LIC-" + crypto.randomBytes(12).toString("hex").toUpperCase();

    const license = await prisma.license.create({
      data: {
        key,
        resellerId,
        status: "ACTIVE",
      },
    });
    return NextResponse.json(license);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate license" }, { status: 500 });
  }
}
