# Razorpay Test Mode Payment Guide

## 🎯 Test Mode - No Real Money!

**Good news!** You're using Razorpay in **TEST MODE** (notice the `rzp_test_` prefix in your key). This means:
- ✅ **NO REAL MONEY will be deducted**
- ✅ All payments are simulated
- ✅ Perfect for testing your payment flow

## 💳 Test Card Details

Use these test card details to make payments:

### Success Card (Payment will succeed) - Indian Cards
- **Card Number:** `5267 3181 8797 5449` (Mastercard - Recommended for Indian accounts)
- **OR:** `4012 8888 8888 1881` (Visa - Alternative)
- **OR:** `4111 1111 1111 1111` (Enter WITHOUT spaces: `4111111111111111`)
- **Expiry Date:** Any future date (e.g., `12/25` or `12/30`)
- **CVV:** Any 3 digits (e.g., `123` or `456`)
- **Cardholder Name:** Any name (e.g., `Test User`)
- **OTP:** `123456` (if asked for OTP)

**Important:** If you get "International cards not supported" error:
1. Try entering card number WITHOUT spaces: `5267318187975449`
2. Use the Mastercard number: `5267 3181 8797 5449`
3. Make sure you're using an Indian test account

### Failed Card (Payment will fail - for testing error handling)
- **Card Number:** `4000 0000 0000 0002`
- **Expiry Date:** Any future date
- **CVV:** Any 3 digits
- **Cardholder Name:** Any name

### Insufficient Funds Card
- **Card Number:** `4000 0000 0000 9995`
- **Expiry Date:** Any future date
- **CVV:** Any 3 digits

## 📱 Test Payment Flow

1. **Book an Appointment:**
   - Select a counsellor
   - Choose date and time
   - Click "Confirm Booking"

2. **On Payment Page:**
   - Review appointment details
   - Click "Pay Now"
   - Razorpay payment modal will open

3. **Enter Test Card Details:**
   - Use the success card: `4111 1111 1111 1111`
   - Expiry: `12/25` (or any future date)
   - CVV: `123` (or any 3 digits)
   - Name: `Test User` (or any name)

4. **Complete Payment:**
   - Click "Pay" button
   - If OTP is asked, enter: `123456`
   - Payment will be processed (no real money deducted!)

5. **Success:**
   - You'll be redirected to the dashboard
   - Appointment will show as "Paid"
   - Google Meet link will be generated

## 🔍 Verification

After payment:
- Check your Razorpay Dashboard (test mode)
- Go to: https://dashboard.razorpay.com/app/payments
- You'll see test payments listed there
- No real money is transferred

## 🚨 Common Issues

1. **Payment Failed:**
   - Make sure you're using test card: `4111 1111 1111 1111`
   - Check expiry date is in the future
   - Try OTP: `123456`

2. **Payment Modal Not Opening:**
   - Check browser console for errors
   - Make sure Razorpay script is loaded
   - Check internet connection

3. **"Invalid Card":**
   - Double-check you're using the test card number
   - Make sure you're in test mode (not live mode)

4. **"International cards are not supported":**
   - Enter card number WITHOUT spaces: `5267318187975449` instead of `5267 3181 8797 5449`
   - Use the Mastercard test card: `5267 3181 8797 5449`
   - Try alternative Visa card: `4012 8888 8888 1881`
   - Make sure your Razorpay account is set up for Indian payments
   - Contact Razorpay support if the issue persists

## 📝 Notes

- All test payments are visible in your Razorpay test dashboard
- Test mode and live mode use different API keys
- Your current key (`rzp_test_...`) is for test mode only
- When you go live, you'll get a new key starting with `rzp_live_...`

## 🎉 You're All Set!

Go ahead and test the payment flow. No real money will be charged!

