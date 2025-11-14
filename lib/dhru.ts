/**
 * DHRU API Integration Utilities
 * 
 * This module provides helper functions for communicating with the DHRU Fusion API.
 * Documentation: https://www.dhru.com/api-documentation/
 */

export interface DHRUCredentials {
  apiUrl: string;
  username: string;
  apiKey: string;
}

export interface DHRUPlaceOrderParams {
  serviceId: string;
  imei?: string;
  file?: {
    name: string;
    data: string; // Base64 encoded
  };
  reference?: string;
}

export interface DHRUOrderResponse {
  status: "SUCCESS" | "ERROR";
  errorCode?: string;
  errorMessage?: string;
  orderId?: string;
  orderStatus?: string;
  code?: string; // Unlock code or result
  credit?: string;
  time?: string;
  [key: string]: any;
}

export interface DHRUBalanceResponse {
  status: "SUCCESS" | "ERROR";
  balance?: string;
  currency?: string;
  errorMessage?: string;
}

/**
 * Make a request to the DHRU API
 */
async function makeDHRURequest(
  credentials: DHRUCredentials,
  action: string,
  params: Record<string, any>
): Promise<any> {
  const payload = {
    username: credentials.username,
    apiaccesskey: credentials.apiKey,
    action,
    ...params,
  };

  try {
    const response = await fetch(credentials.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload).toString(),
    });

    if (!response.ok) {
      throw new Error(`DHRU API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("DHRU API request error:", error);
    throw error;
  }
}

/**
 * Place an order with DHRU API
 */
export async function placeIMEIOrder(
  credentials: DHRUCredentials,
  params: DHRUPlaceOrderParams
): Promise<DHRUOrderResponse> {
  const requestParams: Record<string, any> = {
    serviceid: params.serviceId,
  };

  // Add IMEI if provided
  if (params.imei) {
    requestParams.imei = params.imei;
  }

  // Add file if provided (for file-based services)
  if (params.file) {
    requestParams.filename = params.file.name;
    requestParams.file = params.file.data;
  }

  // Add reference if provided
  if (params.reference) {
    requestParams.reference = params.reference;
  }

  const response = await makeDHRURequest(
    credentials,
    "placeimeiorder",
    requestParams
  );

  return response;
}

/**
 * Check order status on DHRU API
 */
export async function checkOrderStatus(
  credentials: DHRUCredentials,
  orderId: string
): Promise<DHRUOrderResponse> {
  const response = await makeDHRURequest(credentials, "checkimeiorder", {
    orderid: orderId,
  });

  return response;
}

/**
 * Get account balance from DHRU API
 */
export async function getBalance(
  credentials: DHRUCredentials
): Promise<DHRUBalanceResponse> {
  const response = await makeDHRURequest(credentials, "balance", {});
  return response;
}

/**
 * Get service details from DHRU API
 */
export async function getServiceDetails(
  credentials: DHRUCredentials,
  serviceId: string
): Promise<any> {
  const response = await makeDHRURequest(credentials, "getservicedetails", {
    serviceid: serviceId,
  });

  return response;
}

/**
 * Get list of all services from DHRU API
 */
export async function getServiceList(
  credentials: DHRUCredentials
): Promise<any> {
  const response = await makeDHRURequest(credentials, "imeiservicelist", {});
  return response;
}

/**
 * Parse DHRU response and extract key information
 */
export function parseDHRUResponse(response: DHRUOrderResponse) {
  return {
    isSuccess: response.status === "SUCCESS",
    orderId: response.orderId || response.orderid || null,
    status: response.orderStatus || response.status,
    code: response.code || null,
    error: response.errorMessage || response.error || null,
    errorCode: response.errorCode || null,
    credit: response.credit || null,
    fullResponse: response,
  };
}
