# Fix: "International cards are not supported" Error

## Problem
You're getting the error: "International cards are not supported" when trying to pay with Razorpay test cards.

## Solution

### Option 1: Use Indian Test Card (Recommended)
Use this Mastercard test card number that Razorpay recognizes as Indian:

**Card Number:** `5267318187975449` (Enter WITHOUT spaces)
- **Expiry:** Any future date (e.g., `12/25`)
- **CVV:** Any 3 digits (e.g., `123`)
- **Name:** Any name
- **OTP:** `123456` (if asked)

### Option 2: Alternative Visa Card
**Card Number:** `4012888888881881` (Enter WITHOUT spaces)
- **Expiry:** Any future date
- **CVV:** Any 3 digits
- **Name:** Any name

### Option 3: Enable International Cards in Razorpay Dashboard

1. **Login to Razorpay Dashboard:**
   - Go to: https://dashboard.razorpay.com/
   - Make sure you're in **Test Mode** (toggle at top right)

2. **Check Account Settings:**
   - Go to **Settings** → **Payment Methods**
   - Enable **International Cards** if available
   - Save changes

3. **Check API Settings:**
   - Go to **Settings** → **API Keys**
   - Make sure you're using **Test Mode** keys
   - Check if there are any restrictions on payment methods

### Option 4: Contact Razorpay Support

If none of the above work:
1. Contact Razorpay support: support@razorpay.com
2. Ask them to enable international card payments for your test account
3. Or ask for the correct Indian test card numbers for your account

## Quick Test

Try this card number (enter without spaces):
```
5267318187975449
```

If this doesn't work, the issue is likely with your Razorpay account configuration, not the code.

## Why This Happens

- Razorpay detects card type based on the first few digits (BIN - Bank Identification Number)
- Some test cards are detected as international cards
- Your Razorpay account might have international cards disabled by default
- This is a Razorpay account setting, not a code issue

## Notes

- All test payments are safe - no real money is charged
- The card number format matters - enter without spaces
- Make sure you're using Test Mode keys (starting with `rzp_test_`)
- The payment page now shows the correct test card numbers



