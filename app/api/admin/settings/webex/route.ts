import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptWebexKey, decryptWebexKey } from "@/lib/encryption";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Rate limiting
  const identifier = getRateLimitIdentifier(request);
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.ADMIN_API);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reseller = await prisma.reseller.findUnique({
      where: { id: session.user.resellerId },
      select: {
        webexApiKey: true,
        webexSenderId: true,
        smsEnabled: true,
        smsBalance: true,
        smsCostPerMsg: true,
      },
    });

    if (!reseller) {
      return NextResponse.json(
        { error: "Reseller not found" },
        { status: 404 }
      );
    }

    // Decrypt API key before sending to client
    const decryptedKey = reseller.webexApiKey ? decryptWebexKey(reseller.webexApiKey) : null;

    return NextResponse.json({
      ...reseller,
      webexApiKey: decryptedKey,
    });
  } catch (error) {
    console.error("Failed to fetch Webex settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Rate limiting
  const identifier = getRateLimitIdentifier(request);
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.ADMIN_API);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      webexApiKey,
      webexSenderId,
      smsEnabled,
      smsBalance,
      smsCostPerMsg,
    } = body;

    // Validate cost per message
    if (smsCostPerMsg < 0 || smsCostPerMsg > 1) {
      return NextResponse.json(
        { error: "Cost per message must be between $0 and $1" },
        { status: 400 }
      );
    }

    // Validate SMS balance
    if (smsBalance < 0) {
      return NextResponse.json(
        { error: "SMS balance cannot be negative" },
        { status: 400 }
      );
    }

    // Encrypt API key before storing
    const encryptedKey = webexApiKey ? encryptWebexKey(webexApiKey) : null;

    const updatedReseller = await prisma.reseller.update({
      where: { id: session.user.resellerId },
      data: {
        webexApiKey: encryptedKey,
        webexSenderId: webexSenderId || null,
        smsEnabled: smsEnabled || false,
        smsBalance: parseFloat(smsBalance) || 0,
        smsCostPerMsg: parseFloat(smsCostPerMsg) || 0.05,
      },
      select: {
        webexApiKey: true,
        webexSenderId: true,
        smsEnabled: true,
        smsBalance: true,
        smsCostPerMsg: true,
      },
    });

    // Decrypt before returning to client
    const decryptedKey = updatedReseller.webexApiKey ? decryptWebexKey(updatedReseller.webexApiKey) : null;

    return NextResponse.json({
      ...updatedReseller,
      webexApiKey: decryptedKey,
    });
  } catch (error) {
    console.error("Failed to update Webex settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
