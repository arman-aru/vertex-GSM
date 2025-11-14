# SMS Notification System Documentation

## Overview

The SMS notification system automatically sends unlock codes to customers via SMS using the Webex Connect (IMIconnect) API. It includes intelligent cost calculation, Unicode detection, and automatic balance management.

## Features

### ✅ Core Functionality
- **Automatic Notifications**: Sends SMS when orders complete with unlock codes
- **Webex Connect Integration**: Uses industry-standard SMS API
- **Cost Tracking**: Automatically deducts SMS costs from reseller balance
- **Unicode Detection**: Identifies non-GSM-7 characters that increase costs
- **Multi-segment Handling**: Calculates costs for long messages
- **Balance Protection**: Prevents sending if insufficient balance

### ✅ Cost Optimization
- **GSM-7 Encoding**: Standard messages (160 chars per segment)
- **Unicode Detection**: Warns about expensive Unicode characters
- **Segment Calculation**: Accurate cost estimates for multi-part messages
- **Cost Warnings**: Logs detailed warnings for reseller awareness

## Architecture

### Components

1. **`/lib/notifications.ts`** - Core notification system
   - `sendNotification()` - Main function to send SMS
   - `detectEncoding()` - Detects GSM-7 vs Unicode
   - `calculateSMSCost()` - Calculates segments and costs
   - `formatUnlockCodeMessage()` - Standard message templates

2. **Database Fields** (Reseller model):
   ```prisma
   webexApiKey     String?
   webexSenderId   String?
   smsEnabled      Boolean  @default(false)
   smsBalance      Float    @default(0)
   smsCostPerMsg   Float    @default(0.05)
   ```

3. **Database Fields** (User model):
   ```prisma
   phone         String?
   smsEnabled    Boolean  @default(true)
   ```

4. **Admin UI**: `/admin/settings/webex`
5. **API Endpoint**: `/api/admin/settings/webex`

## SMS Cost Calculation

### GSM-7 Encoding (Cheaper)
```
Characters: 160 per segment (single)
            153 per segment (multi-part)
Cost:       $0.05 per segment (default)
```

**GSM-7 Character Set:**
- Basic Latin: A-Z, a-z, 0-9
- Common symbols: @£$¥èéùìòÇ !#%&()*+,-./:;<=>?
- Extended (2 chars): ^{}\\[~]|€

### Unicode Encoding (More Expensive)
```
Characters: 70 per segment (single)
            67 per segment (multi-part)
Cost:       $0.05 per segment (default)
Effect:     ~2.3x more segments for same message
```

**Unicode Triggers:**
- Emojis: 😀 🎉 ✅
- Special symbols: ™ ® © ° • –
- Non-Latin scripts: 中文, العربية, हिंदी
- Math symbols: ≠ ≤ ≥ √ π

### Cost Examples

| Message | Encoding | Length | Segments | Cost |
|---------|----------|--------|----------|------|
| "Your code: 123456" | GSM-7 | 18 | 1 | $0.05 |
| "Your code: 123456 ✅" | Unicode | 19 | 1 | $0.05 |
| Long GSM message (200 chars) | GSM-7 | 200 | 2 | $0.10 |
| Long Unicode (100 chars) | Unicode | 100 | 2 | $0.10 |

## Setup Guide

### 1. Get Webex Connect Credentials

1. Sign up at https://www.imiconnect.io/
2. Navigate to **Settings** > **API Keys**
3. Create new API key
4. Note your Sender ID (phone number or alphanumeric)

### 2. Configure in Admin Panel

Navigate to `/admin/settings/webex`:

```
API Key:           [Your Webex API Key]
Sender ID:         [Your Sender ID or Phone]
SMS Enabled:       ✓ Enable
SMS Balance:       $100.00
Cost Per Message:  $0.05
```

### 3. Add User Phone Numbers

Users need phone numbers to receive SMS:
- Admin can add via `/admin/users/{id}`
- Users can add via `/dashboard/account`

Format: International format recommended
```
+1234567890
+44123456789
```

## Usage

### Automatic Notifications

SMS is sent automatically when:
1. Order status changes to "Completed"
2. DHRU returns unlock code
3. User has phone number
4. User has SMS enabled
5. Reseller has SMS enabled
6. Reseller has sufficient balance

### Message Format

```
{CompanyName}

Order: ORD-123456
Service: iPhone Unlock

Your unlock code:
123456789012345

Thank you for your business!
```

### Manual Notification (Programmatic)

```typescript
import { sendNotification, formatUnlockCodeMessage } from "@/lib/notifications";

const message = formatUnlockCodeMessage(
  "ORD-123",
  "iPhone Unlock",
  "123456",
  "My Company"
);

const result = await sendNotification(userId, message);

if (result.success) {
  console.log("SMS sent:", result.messageId);
  console.log("Cost:", result.costBreakdown.totalCost);
  console.log("Warnings:", result.warnings);
}
```

## Cost Management

### Checking Balance

Admin can view SMS balance in:
- `/admin/settings/webex`
- Dashboard (coming soon)

### Adding Balance

Currently manual update in settings page. Balance should be topped up regularly based on usage.

### Cost Tracking

Every SMS logs:
```javascript
{
  messageLength: 85,
  encoding: "GSM-7",
  segments: 1,
  costPerSegment: 0.05,
  totalCost: 0.05,
  isUnicode: false
}
```

### Unicode Warnings

When Unicode detected, logs include:
```javascript
{
  warnings: [
    "⚠️ Message contains Unicode characters: ✅, 😀",
    "⚠️ Unicode messages cost more (2 segments vs 1 for GSM-7)"
  ]
}
```

## Monitoring

### Server Logs

Check logs after each SMS:

```
✅ SMS sent to user abc123 for order ORD-456
Cost: $0.05 (1 segment, GSM-7)

⚠️ SMS sent with Unicode characters: ✅
Cost: $0.10 (2 segments, Unicode)
Estimated savings with GSM-7: $0.05
```

### Failed Notifications

```
❌ Failed to send SMS for order ORD-789:
Reason: Insufficient SMS balance
Required: $0.05
Current: $0.02
```

### Skipped Notifications

```
ℹ️ SMS skipped for order ORD-321:
Reason: User has no phone number on file
```

## User Preferences

### Enable/Disable SMS

Users can control SMS notifications:
- Default: Enabled
- Can disable in `/dashboard/account`
- Reseller can enforce via admin panel

### Phone Number Management

Users must provide phone number:
- Required for SMS
- International format preferred
- Validated on input

## Security

### API Key Protection
- Stored in database (should be encrypted in production)
- Never exposed to client
- Server-to-server communication only

### Balance Protection
- Balance checked before sending
- Atomic deduction after successful send
- No send if insufficient balance

### Multi-tenant Isolation
- Each reseller has own Webex credentials
- Separate SMS balances per reseller
- No data leakage

## Error Handling

### Insufficient Balance
```javascript
{
  success: false,
  error: "Insufficient SMS balance",
  requiredBalance: 0.05,
  currentBalance: 0.02
}
```

### Missing Credentials
```javascript
{
  success: false,
  error: "Webex API credentials not configured"
}
```

### User Has No Phone
```javascript
{
  success: false,
  skipped: true,
  reason: "User has no phone number on file"
}
```

### Webex API Error
```javascript
{
  success: false,
  error: "Webex API request failed: Invalid API key"
}
```

## Best Practices

### 1. Avoid Unicode When Possible
```
❌ Bad:  "Code ready ✅ 😀"
✅ Good: "Code ready!"

❌ Bad:  "Order™ Complete"
✅ Good: "Order Complete"
```

### 2. Keep Messages Concise
```
❌ Bad:  200-character message (2 segments)
✅ Good: 150-character message (1 segment)
```

### 3. Monitor Balance
- Check balance daily
- Set up low-balance alerts (future feature)
- Top up before running out

### 4. Test Before Going Live
```typescript
// Test with a single order first
const estimate = await estimateSMSCost(resellerId, message);
console.log("Cost:", estimate.totalCost);
console.log("Can afford:", estimate.canAfford);
```

### 5. Review Logs Regularly
- Check for Unicode warnings
- Monitor cost trends
- Identify cost optimization opportunities

## Cost Optimization Tips

### 1. Use Template Messages
Pre-defined templates without Unicode:
```typescript
const template = `${companyName}

Order: ${orderNumber}
Service: ${serviceName}

Your unlock code:
${code}

Thank you for your business!`;
```

### 2. Remove Unnecessary Characters
```
❌ "Order #ORD-123 ✓"  → Unicode
✅ "Order ORD-123"      → GSM-7
```

### 3. Avoid Emojis
```
❌ "🎉 Success! Your code: 123"  → Unicode
✅ "Success! Your code: 123"     → GSM-7
```

### 4. Use Abbreviations
```
❌ "Your order has been completed successfully"  → 160+ chars
✅ "Order completed. Code: 123"                   → 27 chars
```

## API Reference

### sendNotification()
```typescript
await sendNotification(
  userId: string,
  message: string,
  options?: {
    skipBalanceCheck?: boolean;
    skipCostDeduction?: boolean;
  }
)
```

### calculateSMSCost()
```typescript
const cost = calculateSMSCost(
  message: string,
  costPerSegment: number = 0.05
)
// Returns: SMSCostBreakdown
```

### detectEncoding()
```typescript
const encoding = detectEncoding(message: string)
// Returns: { encoding, isUnicode, unicodeCharacters }
```

### formatUnlockCodeMessage()
```typescript
const message = formatUnlockCodeMessage(
  orderNumber: string,
  serviceName: string,
  code: string,
  companyName?: string
)
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| SMS not sending | Check Webex credentials, balance, and user phone number |
| High costs | Review logs for Unicode warnings, optimize messages |
| Balance depleting fast | Check for Unicode usage, monitor segment counts |
| User not receiving | Verify phone number format, check user SMS preferences |
| Webex API error | Verify API key validity, check Webex account status |

## Future Enhancements

- [ ] SMS delivery status tracking
- [ ] Low balance email alerts
- [ ] SMS template manager
- [ ] Bulk SMS sending
- [ ] SMS analytics dashboard
- [ ] Automatic balance top-up
- [ ] SMS delivery reports
- [ ] A/B testing for message templates

---

**🎉 SMS Notification System Complete!**

Your customers will now receive unlock codes automatically via SMS, with intelligent cost tracking and Unicode detection to minimize expenses.
