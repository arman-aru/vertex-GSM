import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkOrderStatus,
  parseDHRUResponse,
  type DHRUCredentials,
} from "@/lib/dhru";
import {
  sendNotification,
  formatUnlockCodeMessage,
} from "@/lib/notifications";

/**
 * Check order status from DHRU API and update local database
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = params.id;

    // Get order from database
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
        resellerId: session.user.resellerId,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If order doesn't have a supplier order ID, return current status
    if (!order.supplierOrderId) {
      return NextResponse.json({
        orderNumber: order.orderNumber,
        status: order.status,
        code: order.code,
        message: "Order has not been submitted to supplier yet",
      });
    }

    // Get supplier credentials
    const supplier = await prisma.supplier.findFirst({
      where: {
        resellerId: session.user.resellerId,
        isActive: true,
      },
      orderBy: {
        priority: "desc",
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 400 }
      );
    }

    // Check status with DHRU API
    try {
      const credentials: DHRUCredentials = {
        apiUrl: supplier.apiUrl,
        username: supplier.username,
        apiKey: supplier.apiKey,
      };

      const dhruResponse = await checkOrderStatus(
        credentials,
        order.supplierOrderId
      );
      const parsed = parseDHRUResponse(dhruResponse);

      // Check if order status changed to Completed and has a code
      const wasCompleted = order.status === "COMPLETED";
      const isNowCompleted = parsed.status === "Completed" && parsed.code;
      const shouldNotify = !wasCompleted && isNowCompleted;

      // Update order with latest status
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          supplierStatus: parsed.status || null,
          code: parsed.code || order.code,
          supplierResponse: parsed.fullResponse,
          status: parsed.isSuccess
            ? parsed.status === "Completed"
              ? "COMPLETED"
              : parsed.status === "Rejected"
              ? "CANCELLED"
              : "PENDING"
            : order.status,
        },
        include: {
          reseller: true,
        },
      });

      // Send SMS notification if order just completed with unlock code
      let notificationResult = null;
      if (shouldNotify && parsed.code) {
        try {
          const orderItems = order.items as any;
          const serviceName = orderItems?.serviceName || "Service";
          
          const message = formatUnlockCodeMessage(
            order.orderNumber,
            serviceName,
            parsed.code,
            updatedOrder.reseller.companyName
          );

          notificationResult = await sendNotification(order.userId, message);

          // Log notification result
          if (notificationResult.success) {
            console.log(
              `✅ SMS sent to user ${order.userId} for order ${order.orderNumber}`,
              notificationResult.costBreakdown
            );
            
            // Log warnings if any
            if (notificationResult.warnings?.length) {
              console.warn("SMS Warnings:", notificationResult.warnings);
            }
          } else if (!notificationResult.skipped) {
            console.error(
              `❌ Failed to send SMS for order ${order.orderNumber}:`,
              notificationResult.error
            );
          }
        } catch (notifError) {
          console.error("Notification error:", notifError);
          // Don't fail the whole request if notification fails
        }
      }

      return NextResponse.json({
        orderNumber: order.orderNumber,
        status: parsed.status,
        code: parsed.code,
        supplierOrderId: order.supplierOrderId,
        isSuccess: parsed.isSuccess,
        error: parsed.error,
        notification: notificationResult
          ? {
              sent: notificationResult.success,
              skipped: notificationResult.skipped,
              cost: notificationResult.costBreakdown?.totalCost,
              warnings: notificationResult.warnings,
            }
          : null,
      });
    } catch (dhruError: any) {
      return NextResponse.json(
        {
          orderNumber: order.orderNumber,
          status: order.status,
          code: order.code,
          error: "Failed to check status with supplier",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to check order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
