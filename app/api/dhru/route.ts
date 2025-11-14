import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  placeIMEIOrder,
  checkOrderStatus,
  getBalance,
  getServiceList,
  parseDHRUResponse,
  type DHRUCredentials,
  type DHRUPlaceOrderParams,
} from "@/lib/dhru";

/**
 * DHRU API Route Handler
 * 
 * This is the central route for all DHRU API interactions.
 * It handles:
 * - Order placement (IMEI and File services)
 * - Order status checking
 * - Balance checking
 * - Service list fetching
 * 
 * All requests are authenticated and use the reseller's configured DHRU credentials.
 */

interface DHRURequestBody {
  action: "placeorder" | "checkorder" | "balance" | "services";
  orderId?: string; // For checkorder action
  serviceId?: string; // For placeorder action
  imei?: string; // For IMEI services
  file?: {
    name: string;
    data: string;
  }; // For file services
  reference?: string; // Optional reference for tracking
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow RESELLER_ADMIN to make DHRU API calls
    if (session.user.role !== "RESELLER_ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body: DHRURequestBody = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    // Get active DHRU supplier credentials for this reseller
    const supplier = await prisma.supplier.findFirst({
      where: {
        resellerId: session.user.resellerId,
        isActive: true,
      },
      orderBy: {
        priority: "desc", // Use highest priority supplier
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "No active DHRU supplier configured" },
        { status: 400 }
      );
    }

    const credentials: DHRUCredentials = {
      apiUrl: supplier.apiUrl,
      username: supplier.username,
      apiKey: supplier.apiKey,
    };

    // Handle different actions
    switch (action) {
      case "placeorder": {
        const { serviceId, imei, file, reference } = body;

        if (!serviceId) {
          return NextResponse.json(
            { error: "Service ID is required" },
            { status: 400 }
          );
        }

        // Validate that either IMEI or file is provided
        if (!imei && !file) {
          return NextResponse.json(
            { error: "Either IMEI or file is required" },
            { status: 400 }
          );
        }

        const orderParams: DHRUPlaceOrderParams = {
          serviceId,
          imei,
          file,
          reference,
        };

        // Make DHRU API call
        const dhruResponse = await placeIMEIOrder(credentials, orderParams);
        const parsed = parseDHRUResponse(dhruResponse);

        if (!parsed.isSuccess) {
          return NextResponse.json(
            {
              success: false,
              error: parsed.error || "Failed to place order with supplier",
              errorCode: parsed.errorCode,
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          orderId: parsed.orderId,
          status: parsed.status,
          code: parsed.code,
          credit: parsed.credit,
          response: parsed.fullResponse,
        });
      }

      case "checkorder": {
        const { orderId } = body;

        if (!orderId) {
          return NextResponse.json(
            { error: "Order ID is required" },
            { status: 400 }
          );
        }

        // Check order status with DHRU
        const dhruResponse = await checkOrderStatus(credentials, orderId);
        const parsed = parseDHRUResponse(dhruResponse);

        return NextResponse.json({
          success: parsed.isSuccess,
          orderId: parsed.orderId,
          status: parsed.status,
          code: parsed.code,
          error: parsed.error,
          response: parsed.fullResponse,
        });
      }

      case "balance": {
        // Get supplier balance
        const balanceResponse = await getBalance(credentials);

        return NextResponse.json({
          success: balanceResponse.status === "SUCCESS",
          balance: balanceResponse.balance,
          currency: balanceResponse.currency,
          error: balanceResponse.errorMessage,
        });
      }

      case "services": {
        // Get list of available services from DHRU
        const servicesResponse = await getServiceList(credentials);

        return NextResponse.json({
          success: servicesResponse.status === "SUCCESS",
          services: servicesResponse.data || servicesResponse.services || [],
          error: servicesResponse.errorMessage,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("DHRU API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update local order with DHRU response
 * This can be called from other API routes
 */
export async function updateOrderWithDHRUResponse(
  orderId: string,
  dhruResponse: any
) {
  const parsed = parseDHRUResponse(dhruResponse);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      supplierOrderId: parsed.orderId,
      supplierResponse: parsed.fullResponse,
      supplierStatus: parsed.status,
      code: parsed.code,
      status: parsed.isSuccess
        ? parsed.status === "Completed"
          ? "COMPLETED"
          : "PENDING"
        : "CANCELLED",
    },
  });

  return parsed;
}
