/**
 * Notification System with Webex Connect API Integration
 * 
 * This module handles SMS notifications for order updates, including:
 * - Webex Connect API integration
 * - SMS character encoding detection (GSM-7 vs Unicode)
 * - Cost calculation and tracking
 * - Reseller balance management
 */

import { prisma } from "./prisma";
import { decryptWebexKey } from "./encryption";

export interface WebexCredentials {
  apiKey: string;
  senderId: string;
}

export interface SMSMessage {
  to: string; // Phone number
  message: string;
  senderId?: string;
}

export interface SMSCostBreakdown {
  messageLength: number;
  encoding: "GSM-7" | "Unicode";
  segments: number;
  costPerSegment: number;
  totalCost: number;
  isUnicode: boolean;
  unicodeCharacters?: string[];
}

/**
 * GSM-7 character set
 * These characters are considered "safe" and fit in a single byte
 */
const GSM7_CHARS = 
  "@£$¥èéùìòÇ\\nØø\\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\\\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/**
 * GSM-7 extended characters (count as 2 characters)
 */
const GSM7_EXTENDED = "^{}\\\\[~]|€";

/**
 * Detect if a message contains non-GSM-7 characters (Unicode)
 */
export function detectEncoding(message: string): {
  encoding: "GSM-7" | "Unicode";
  isUnicode: boolean;
  unicodeCharacters: string[];
} {
  const unicodeChars: string[] = [];
  
  for (const char of message) {
    if (!GSM7_CHARS.includes(char) && !GSM7_EXTENDED.includes(char)) {
      if (!unicodeChars.includes(char)) {
        unicodeChars.push(char);
      }
    }
  }

  const isUnicode = unicodeChars.length > 0;
  
  return {
    encoding: isUnicode ? "Unicode" : "GSM-7",
    isUnicode,
    unicodeCharacters: unicodeChars,
  };
}

/**
 * Calculate SMS cost based on message length and encoding
 */
export function calculateSMSCost(
  message: string,
  costPerSegment: number = 0.05
): SMSCostBreakdown {
  const { encoding, isUnicode, unicodeCharacters } = detectEncoding(message);
  
  // Calculate message length considering extended GSM-7 characters
  let adjustedLength = 0;
  for (const char of message) {
    if (GSM7_EXTENDED.includes(char)) {
      adjustedLength += 2; // Extended chars count as 2
    } else {
      adjustedLength += 1;
    }
  }

  // SMS segment limits
  const maxCharsPerSegment = isUnicode ? 70 : 160;
  const maxCharsMultiSegment = isUnicode ? 67 : 153;

  // Calculate number of segments
  let segments: number;
  if (adjustedLength <= maxCharsPerSegment) {
    segments = 1;
  } else {
    segments = Math.ceil(adjustedLength / maxCharsMultiSegment);
  }

  const totalCost = segments * costPerSegment;

  return {
    messageLength: adjustedLength,
    encoding,
    segments,
    costPerSegment,
    totalCost,
    isUnicode,
    unicodeCharacters: isUnicode ? unicodeCharacters : undefined,
  };
}

/**
 * Send SMS via Webex Connect API
 */
async function sendWebexSMS(
  credentials: WebexCredentials,
  message: SMSMessage
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Webex Connect API endpoint
    const apiUrl = "https://api.imiconnect.io/resources/v1/messaging";

    const payload = {
      channels: ["SMS"],
      destination: [
        {
          msisdn: message.to,
        },
      ],
      message: {
        text: message.message,
      },
      source: message.senderId || credentials.senderId,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "key": credentials.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Webex API request failed");
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.messageId || data.id,
    };
  } catch (error: any) {
    console.error("Webex SMS error:", error);
    return {
      success: false,
      error: error?.message || "Failed to send SMS",
    };
  }
}

/**
 * Main notification function - sends SMS to user
 * 
 * @param userId - User ID to send notification to
 * @param message - Message content
 * @param options - Additional options
 */
export async function sendNotification(
  userId: string,
  message: string,
  options: {
    skipBalanceCheck?: boolean;
    skipCostDeduction?: boolean;
  } = {}
) {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reseller: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has SMS enabled
    if (!user.smsEnabled) {
      return {
        success: false,
        skipped: true,
        reason: "User has SMS notifications disabled",
      };
    }

    // Check if user has phone number
    if (!user.phone) {
      return {
        success: false,
        skipped: true,
        reason: "User has no phone number on file",
      };
    }

    // Check if reseller has SMS enabled
    if (!user.reseller.smsEnabled) {
      return {
        success: false,
        skipped: true,
        reason: "SMS notifications are disabled for this reseller",
      };
    }

    // Check if reseller has Webex credentials
    if (!user.reseller.webexApiKey || !user.reseller.webexSenderId) {
      return {
        success: false,
        error: "Webex API credentials not configured",
      };
    }

    // Decrypt Webex API key
    const decryptedApiKey = decryptWebexKey(user.reseller.webexApiKey);

    // Calculate SMS cost
    const costBreakdown = calculateSMSCost(
      message,
      user.reseller.smsCostPerMsg
    );

    // Warn about Unicode characters
    const warnings: string[] = [];
    if (costBreakdown.isUnicode) {
      warnings.push(
        `⚠️ Message contains Unicode characters: ${costBreakdown.unicodeCharacters?.join(", ")}`
      );
      warnings.push(
        `⚠️ Unicode messages are more expensive (${costBreakdown.segments} segments vs ~${Math.ceil(costBreakdown.messageLength / 160)} for GSM-7)`
      );
    }

    // Check reseller SMS balance
    if (!options.skipBalanceCheck && user.reseller.smsBalance < costBreakdown.totalCost) {
      return {
        success: false,
        error: "Insufficient SMS balance",
        costBreakdown,
        warnings,
        requiredBalance: costBreakdown.totalCost,
        currentBalance: user.reseller.smsBalance,
      };
    }

    // Send SMS via Webex
    const credentials: WebexCredentials = {
      apiKey: decryptedApiKey,
      senderId: user.reseller.webexSenderId,
    };

    const smsResult = await sendWebexSMS(credentials, {
      to: user.phone,
      message,
    });

    if (!smsResult.success) {
      return {
        success: false,
        error: smsResult.error,
        costBreakdown,
        warnings,
      };
    }

    // Deduct SMS cost from reseller balance
    if (!options.skipCostDeduction) {
      await prisma.reseller.update({
        where: { id: user.resellerId },
        data: {
          smsBalance: {
            decrement: costBreakdown.totalCost,
          },
        },
      });
    }

    return {
      success: true,
      messageId: smsResult.messageId,
      costBreakdown,
      warnings,
      balanceAfter: user.reseller.smsBalance - costBreakdown.totalCost,
    };
  } catch (error: any) {
    console.error("Send notification error:", error);
    return {
      success: false,
      error: error?.message || "Failed to send notification",
    };
  }
}

/**
 * Format unlock code notification message
 */
export function formatUnlockCodeMessage(
  orderNumber: string,
  serviceName: string,
  code: string,
  companyName: string = "Vertex GSM"
): string {
  return `${companyName}\n\nOrder: ${orderNumber}\nService: ${serviceName}\n\nYour unlock code:\n${code}\n\nThank you for your business!`;
}

/**
 * Format order status notification
 */
export function formatOrderStatusMessage(
  orderNumber: string,
  status: string,
  companyName: string = "Vertex GSM"
): string {
  return `${companyName}\n\nOrder ${orderNumber}\nStatus: ${status}\n\nCheck your account for details.`;
}

/**
 * Get SMS cost estimate before sending
 */
export async function estimateSMSCost(
  resellerId: string,
  message: string
): Promise<SMSCostBreakdown & { canAfford: boolean; balance: number }> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: resellerId },
  });

  if (!reseller) {
    throw new Error("Reseller not found");
  }

  const costBreakdown = calculateSMSCost(message, reseller.smsCostPerMsg);

  return {
    ...costBreakdown,
    canAfford: reseller.smsBalance >= costBreakdown.totalCost,
    balance: reseller.smsBalance,
  };
}
