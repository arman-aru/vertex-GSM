# DHRU Integration - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Configure DHRU Supplier

Navigate to `/admin/suppliers` and add your DHRU credentials:

```
API URL:  https://www.dhru.com/api/
Username: your-dhru-username
API Key:  your-dhru-api-key
Priority: 1
Status:   Active ✓
```

### 2. Test Connection

```bash
# Test balance endpoint
curl -X POST http://localhost:3000/api/dhru \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"action": "balance"}'

# Expected response:
{
  "success": true,
  "balance": "100.00",
  "currency": "USD"
}
```

### 3. Sync Services (Optional)

```bash
# Fetch services from DHRU
curl -X POST http://localhost:3000/api/dhru \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"action": "services"}'
```

## 📋 How It Works

### For End Users (Customers)

1. **Browse Services** → `/dashboard/place-order`
2. **Enter IMEI/Upload File**
3. **Click "Place Order"**
4. **System automatically:**
   - Deducts balance
   - Creates order
   - **Sends to DHRU API** ← This is automatic!
   - Shows result instantly

### For Admins (Resellers)

1. **Monitor Orders** → `/admin/orders`
2. **View all order details:**
   - Local order number
   - DHRU order ID
   - Status from DHRU
   - Unlock code (when ready)

## 🔄 Order Lifecycle

```
User Places Order
    ↓
Balance Deducted
    ↓
DHRU API Called (automatic)
    ↓
Order ID Returned
    ↓
Status Updated
    ↓
Code Delivered (when ready)
```

## 🛡️ Safety Features

### Automatic Refund
If DHRU API fails, the system automatically:
- ✅ Cancels the order
- ✅ Refunds user balance
- ✅ Shows error message

### Multi-tenant Security
- Each reseller has their own DHRU credentials
- Orders are isolated by reseller
- No data leakage

## 📊 Key Files Created

| File | Purpose |
|------|---------|
| `/lib/dhru.ts` | DHRU API helper functions |
| `/app/api/dhru/route.ts` | Direct DHRU API endpoint (admin) |
| `/app/api/orders/route.ts` | Order placement with DHRU integration |
| `/app/api/orders/[id]/status/route.ts` | Check order status |
| `prisma/schema.prisma` | Updated with DHRU fields |

## 🔧 Updated Schema Fields

```prisma
model Order {
  supplierOrderId  String?   // DHRU order ID
  supplierResponse Json?     // Full DHRU response
  supplierStatus   String?   // Status from DHRU
  code             String?   // Unlock code
}
```

## 📱 API Usage Examples

### Place Order (Automatic via /api/orders)
```javascript
// Frontend code (place-order page)
const response = await fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    serviceId: 'service-uuid',
    imei: '123456789012345',
    quantity: 1
  })
});

// DHRU integration happens automatically!
// Response includes DHRU order ID:
{
  "success": true,
  "order": {
    "orderNumber": "ORD-123",
    "supplierOrderId": "DHRU-456",
    "status": "PENDING",
    "code": null
  }
}
```

### Check Order Status
```javascript
const response = await fetch(`/api/orders/${orderId}/status`);

// Returns latest status from DHRU:
{
  "orderNumber": "ORD-123",
  "status": "Completed",
  "code": "123456",
  "supplierOrderId": "DHRU-456"
}
```

## ⚠️ Important Notes

### Before Going Live:

1. ✅ Test with DHRU sandbox environment first
2. ✅ Verify all credentials are correct
3. ✅ Check supplier balance is sufficient
4. ✅ Test order placement end-to-end
5. ✅ Verify automatic refund works
6. ⚠️ **Encrypt API keys in production!**

### Database Migration Required:

```bash
npx prisma migrate dev --name add_dhru_fields
```

This adds the new DHRU fields to the Order model.

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "No active supplier" | Add supplier in `/admin/suppliers` |
| "Invalid credentials" | Check username/API key in supplier settings |
| Order stuck in PENDING | Call `/api/orders/{id}/status` to refresh |
| Balance not refunded | Check server logs for transaction errors |

## 📞 Support

For DHRU API documentation:
- https://www.dhru.com/api-documentation/

For detailed integration docs:
- See `DHRU_INTEGRATION.md`

---

**🎉 Integration Complete!**

The DHRU API is fully integrated. Orders placed by users automatically go to DHRU, and responses are saved in your database. No manual intervention needed!
