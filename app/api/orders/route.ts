import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import {
  placeIMEIOrder,
  parseDHRUResponse,
  type DHRUCredentials,
  type DHRUPlaceOrderParams,
} from "@/lib/dhru";
import {
  sendNotification,
  formatUnlockCodeMessage,
} from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { serviceId, imei, file, quantity = 1 } = body;

    // Validate service exists and is enabled
    const service = await prisma.managedService.findFirst({
      where: {
        id: serviceId,
        resellerId: session.user.resellerId,
        isEnabled: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or not available" },
        { status: 404 }
      );
    }

    // Validate quantity
    if (quantity < service.minQuantity || quantity > service.maxQuantity) {
      return NextResponse.json(
        {
          error: `Quantity must be between ${service.minQuantity} and ${service.maxQuantity}`,
        },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = service.ourPrice * quantity;

    // Check user balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.balance < totalAmount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Get active DHRU supplier for this reseller
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
        { error: "No active supplier configured. Please contact support." },
        { status: 400 }
      );
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order and deduct balance in a transaction
    const order = await prisma.$transaction(async (tx: any) => {
      // Deduct balance
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          balance: {
            decrement: totalAmount,
          },
        },
      });

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: OrderStatus.PENDING,
          totalAmount,
          currency: "USD",
          items: {
            serviceId: service.id,
            serviceName: service.name,
            serviceType: service.serviceType,
            quantity,
            price: service.ourPrice,
            supplierPrice: service.supplierPrice,
            imei: imei || null,
            fileName: file?.name || null,
            fileData: file?.data || null,
          },
          userId: session.user.id,
          resellerId: session.user.resellerId,
        },
      });

      return newOrder;
    });

    // Place order with DHRU API
    try {
      const credentials: DHRUCredentials = {
        apiUrl: supplier.apiUrl,
        username: supplier.username,
        apiKey: supplier.apiKey,
      };

      const orderParams: DHRUPlaceOrderParams = {
        serviceId: service.supplierServiceId,
        imei,
        file,
        reference: orderNumber,
      };

      const dhruResponse = await placeIMEIOrder(credentials, orderParams);
      const parsed = parseDHRUResponse(dhruResponse);

      // Update order with DHRU response
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          supplierOrderId: parsed.orderId || null,
          supplierResponse: parsed.fullResponse,
          supplierStatus: parsed.status || null,
          code: parsed.code || null,
          status: parsed.isSuccess
            ? parsed.status === "Completed"
              ? OrderStatus.COMPLETED
              : OrderStatus.PENDING
            : OrderStatus.CANCELLED,
                include: {
                  reseller: true,
                },

              // Send SMS notification if order completed immediately with code
              if (parsed.isSuccess && parsed.status === "Completed" && parsed.code) {
                try {
                  const message = formatUnlockCodeMessage(
                    order.orderNumber,
                    service.name,
                    parsed.code,
                    updatedOrder.reseller.companyName
                  );

                  const notificationResult = await sendNotification(
                    session.user.id,
                    message
                  );

                  if (notificationResult.success) {
                    console.log(
                      `✅ SMS sent for instant order completion: ${order.orderNumber}`
                    );
                    if (notificationResult.warnings?.length) {
                      console.warn("SMS Warnings:", notificationResult.warnings);
                    }
                  }
                } catch (notifError) {
                  console.error("Failed to send instant notification:", notifError);
                }
              }
        },
      });

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: parsed.isSuccess
            ? parsed.status === "Completed"
              ? "COMPLETED"
              : "PENDING"
            : "CANCELLED",
          totalAmount: order.totalAmount,
          supplierOrderId: parsed.orderId,
          code: parsed.code,
        },
      });
    } catch (dhruError: any) {
      // If DHRU API fails, mark order as cancelled and refund
      await prisma.$transaction(async (tx: any) => {
        // Mark order as cancelled
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            supplierResponse: {
              error: dhruError?.message || "Failed to place order with supplier",
            },
          },
        });

        // Refund user
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            balance: {
              increment: totalAmount,
            },
          },
        });
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to process order with supplier. Your balance has been refunded.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
