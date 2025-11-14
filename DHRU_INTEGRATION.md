# DHRU API Integration Documentation

## Overview

The DHRU API integration is the core backend component that connects Vertex GSM with DHRU Fusion suppliers. It handles order placement, status checking, balance queries, and service synchronization.

## Architecture

### Components

1. **`/lib/dhru.ts`** - Helper utilities for DHRU API communication
2. **`/app/api/dhru/route.ts`** - Direct DHRU API route (admin only)
3. **`/app/api/orders/route.ts`** - Order placement with automatic DHRU integration
4. **`/app/api/orders/[id]/status/route.ts`** - Check order status from DHRU

### Database Schema

The `Order` model includes DHRU-specific fields:

```prisma
model Order {
  // ... other fields
  supplierOrderId  String?   // Order ID from DHRU API
  supplierResponse Json?     // Full response from DHRU
  supplierStatus   String?   // Status from DHRU
  code             String?   // Unlock code or result
}
```

## API Endpoints

### 1. Direct DHRU API Route (Admin Only)

**Endpoint:** `POST /api/dhru`

**Authentication:** Requires `RESELLER_ADMIN` role

**Actions:**

#### Place Order
```json
{
  "action": "placeorder",
  "serviceId": "123",
  "imei": "123456789012345",
  "reference": "ORD-123"
}
```

#### Check Order Status
```json
{
  "action": "checkorder",
  "orderId": "DHRU-ORDER-ID"
}
```

#### Get Balance
```json
{
  "action": "balance"
}
```

#### Get Service List
```json
{
  "action": "services"
}
```

### 2. User Order Placement

**Endpoint:** `POST /api/orders`

**Authentication:** Requires authenticated user

**Request Body:**
```json
{
  "serviceId": "service-uuid",
  "imei": "123456789012345",
  "quantity": 1
}
```

**Flow:**
1. Validates service and user balance
2. Deducts balance from user account
3. Creates order in database
4. **Automatically places order with DHRU**
5. Updates order with DHRU response
6. Returns order details with supplier order ID

**Error Handling:**
- If DHRU API fails, order is cancelled and balance is refunded
- User receives clear error message

### 3. Check Order Status

**Endpoint:** `GET /api/orders/{orderId}/status`

**Authentication:** Requires authenticated user (order owner)

**Response:**
```json
{
  "orderNumber": "ORD-123",
  "status": "Completed",
  "code": "123456",
  "supplierOrderId": "DHRU-789",
  "isSuccess": true
}
```

## DHRU API Helper Functions

### `placeIMEIOrder()`
Places an order with DHRU API.

```typescript
const response = await placeIMEIOrder(credentials, {
  serviceId: "123",
  imei: "123456789012345",
  reference: "ORD-123"
});
```

### `checkOrderStatus()`
Checks the status of an existing order.

```typescript
const status = await checkOrderStatus(credentials, "DHRU-ORDER-ID");
```

### `getBalance()`
Gets supplier account balance.

```typescript
const balance = await getBalance(credentials);
```

### `getServiceList()`
Fetches all available services from DHRU.

```typescript
const services = await getServiceList(credentials);
```

### `parseDHRUResponse()`
Parses DHRU API response into standardized format.

```typescript
const parsed = parseDHRUResponse(rawResponse);
// Returns: { isSuccess, orderId, status, code, error, fullResponse }
```

## Configuration

### Setting Up DHRU Supplier

1. Navigate to `/admin/suppliers`
2. Click "Add Supplier"
3. Enter DHRU API credentials:
   - **API URL:** `https://www.dhru.com/api/`
   - **Username:** Your DHRU username
   - **API Key:** Your DHRU API key
4. Set priority (higher = preferred)
5. Save and activate

### Testing DHRU Connection

Use the admin DHRU route to test:

```bash
curl -X POST https://yourdomain.com/api/dhru \
  -H "Content-Type: application/json" \
  -d '{"action": "balance"}'
```

## Order Flow

### Complete Order Lifecycle

```
1. User places order via /dashboard/place-order
   ↓
2. POST /api/orders
   ↓
3. Validate service & balance
   ↓
4. Deduct user balance
   ↓
5. Create order in database (PENDING)
   ↓
6. Call placeIMEIOrder() → DHRU API
   ↓
7. Update order with DHRU response
   ↓
8. Return success to user
   ↓
9. User can check status via /api/orders/{id}/status
   ↓
10. Admin monitors orders in /admin/orders
```

### Error Scenarios

#### Insufficient Balance
- User balance < order cost
- Order rejected before DHRU call
- No refund needed

#### DHRU API Failure
- Balance deducted, order created
- DHRU API call fails
- **Automatic refund triggered**
- Order marked as CANCELLED

#### Service Not Available
- DHRU returns error (e.g., service unavailable)
- **Automatic refund triggered**
- Order marked as CANCELLED
- User notified with DHRU error message

## Security

### Authentication
- All endpoints require authentication
- Admin routes require `RESELLER_ADMIN` role
- Users can only access their own orders

### Multi-tenant Isolation
- All queries filtered by `resellerId`
- Each reseller has their own DHRU credentials
- No data leakage between resellers

### API Key Security
- DHRU API keys stored in database
- **Should be encrypted in production**
- Never exposed to client-side code
- All DHRU calls are server-to-server

## Monitoring & Debugging

### Logging
All DHRU API calls are logged:
- Request parameters
- Response data
- Errors and failures

### Database Tracking
Every order stores:
- `supplierOrderId` - DHRU order ID
- `supplierResponse` - Full API response
- `supplierStatus` - Current status from DHRU
- `code` - Unlock code when completed

### Admin Dashboard
Monitor orders at `/admin/orders`:
- View all orders with DHRU status
- Check unlock codes
- See success/failure rates

## DHRU API Reference

### Common DHRU Actions

| Action | Purpose | Parameters |
|--------|---------|------------|
| `placeimeiorder` | Place new order | `serviceid`, `imei`, `reference` |
| `checkimeiorder` | Check order status | `orderid` |
| `balance` | Get account balance | None |
| `imeiservicelist` | List all services | None |
| `getservicedetails` | Get service info | `serviceid` |

### DHRU Response Format

**Success:**
```json
{
  "status": "SUCCESS",
  "orderId": "12345",
  "orderStatus": "Completed",
  "code": "123456",
  "credit": "99.50"
}
```

**Error:**
```json
{
  "status": "ERROR",
  "errorCode": "INSUFFICIENT_CREDIT",
  "errorMessage": "Not enough balance"
}
```

## Best Practices

1. **Always check supplier balance** before allowing large order volumes
2. **Implement retry logic** for transient DHRU API failures
3. **Monitor DHRU response times** and implement timeouts
4. **Store full DHRU responses** for debugging
5. **Test with DHRU sandbox/test environment** before production
6. **Encrypt DHRU API keys** in production database
7. **Implement rate limiting** to prevent DHRU API abuse
8. **Use webhooks** if DHRU supports them for status updates

## Troubleshooting

### Order Stuck in PENDING
- Check DHRU status manually: `/api/orders/{id}/status`
- Verify supplier credentials are correct
- Check DHRU API service status

### Balance Refund Not Working
- Verify transaction rollback in code
- Check database transaction logs
- Ensure user balance calculation is correct

### DHRU API Timeout
- Increase timeout in fetch configuration
- Check network connectivity
- Verify DHRU API status

### Invalid Credentials Error
- Verify username and API key in `/admin/suppliers`
- Test credentials with balance check
- Regenerate API key in DHRU dashboard

## Future Enhancements

- [ ] Implement DHRU webhooks for real-time status updates
- [ ] Add bulk order processing
- [ ] Implement automatic service synchronization
- [ ] Add DHRU API response caching
- [ ] Implement multi-supplier failover
- [ ] Add detailed analytics and reporting
- [ ] Encrypt API keys at rest
