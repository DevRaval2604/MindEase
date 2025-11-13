# Fixes Applied - API Integration

## Issues Fixed

### 1. Backend Server Not Running
**Problem:** Backend server was not running, causing `ERR_CONNECTION_REFUSED` errors.

**Solution:** 
- Started Django backend server on port 8000
- Server is now running in the background

**Verify:** 
```bash
netstat -ano | findstr ":8000"
```
Should show: `TCP    127.0.0.1:8000         0.0.0.0:0              LISTENING`

### 2. Missing age_group in Client Signup Payload
**Problem:** Frontend was not sending `age_group` field for client signup, but backend expects it.

**Solution:**
- Added age_group mapping in `Register.jsx`
- Maps frontend labels ("Under 18", "18-25", etc.) to backend values ("under_18", "18_25", etc.)
- Age group field now only shows for Client account type

**Changes in `frontend/src/pages/Register.jsx`:**
```javascript
// Added age_group mapping for client signup
if (form.accountType.toLowerCase() === 'client') {
  const ageGroupMap = {
    'Under 18': 'under_18',
    '18-25': '18_25',
    '26-40': '26_40',
    '41-60': '41_60',
    '60+': '60_plus',
  };
  const ageGroupValue = ageGroupMap[form.ageGroup];
  if (ageGroupValue) {
    payload.age_group = ageGroupValue;
  }
}
```

### 3. Improved Error Handling
**Problem:** Network errors (connection refused) were not properly handled, showing generic error messages.

**Solution:**
- Added specific error handling for network errors
- Shows helpful message when backend server is not running
- Better error messages for non-JSON responses

**Changes in `frontend/src/pages/Register.jsx`:**
```javascript
try {
  res = await fetch(`${API_BASE}/api/auth/signup/`, {...});
} catch (fetchError) {
  if (fetchError.message.includes('Failed to fetch') || 
      fetchError.message.includes('ERR_CONNECTION_REFUSED')) {
    setErrors(prev => ({ 
      ...prev, 
      form: 'Cannot connect to server. Please ensure the backend server is running on http://localhost:8000' 
    }));
    return;
  }
  throw fetchError;
}
```

### 4. Fixed Payload Logging
**Problem:** Console log showed `"confirm": "***"` instead of `"confirm_password": "***"`.

**Solution:**
- Fixed console.log to show correct field name
- Changed from `confirm: '***'` to `confirm_password: '***'`

### 5. UI Improvements
**Problem:** Age group field was always visible, even for counsellor signup.

**Solution:**
- Age group field now only shows when account type is "Client"
- Better form layout and validation

---

## Current Status

✅ **Backend Server:** Running on port 8000  
✅ **Frontend Server:** Running on port 5173  
✅ **Register.jsx:** Fixed age_group mapping and error handling  
✅ **API Integration:** All endpoints properly configured  

---

## Testing the Signup Flow

### 1. Verify Servers Are Running

**Backend:**
```bash
netstat -ano | findstr ":8000"
```
Should show server listening on port 8000.

**Frontend:**
```bash
netstat -ano | findstr ":5173"
```
Should show server listening on port 5173.

### 2. Test Client Signup

1. Open http://localhost:5173/register
2. Fill in the form:
   - First Name: Vedant
   - Last Name: Purohit
   - Email: purohitvedant0@gmail.com (or a new email)
   - Phone: 9016362021 (or a new phone number)
   - Password: YourPassword123
   - Confirm Password: YourPassword123
   - Account Type: Client
   - Age Group: Select an age group (e.g., "18-25")
   - Agree to terms: Check the checkbox
3. Click "Register"
4. Should see success message or redirect to verification page

### 3. Test Counsellor Signup

1. Open http://localhost:5173/register
2. Fill in the form:
   - First Name: Vedant
   - Last Name: Purohit
   - Email: counsellor@example.com (new email)
   - Phone: 9016362022 (new phone number)
   - Password: YourPassword123
   - Confirm Password: YourPassword123
   - Account Type: Counsellor
   - License Number: LICENSE123
   - Specialization: Select one (e.g., "Anxiety")
   - Fees: 1000
   - Availability: Select one (e.g., "Weekdays")
   - Agree to terms: Check the checkbox
3. Click "Register"
4. Should see success message or redirect to verification page

---

## Common Issues and Solutions

### Issue: "Cannot connect to server"
**Solution:** 
1. Check if backend server is running: `netstat -ano | findstr ":8000"`
2. If not running, start it: `cd backend && python manage.py runserver`
3. Check backend logs for errors

### Issue: "Email already exists"
**Solution:** 
1. Delete the user from database:
   ```bash
   cd backend
   python delete_user.py purohitvedant0@gmail.com
   ```
2. Or use a different email address

### Issue: "Phone number already used"
**Solution:** 
1. Delete the user from database (same as above)
2. Or use a different phone number

### Issue: CORS errors
**Solution:** 
1. Check `backend/config/settings.py`:
   - `CORS_ALLOWED_ORIGINS` should include `http://localhost:5173`
   - `CORS_ALLOW_CREDENTIALS = True`
2. Restart backend server after changes

### Issue: "Email verification failed"
**Solution:** 
1. Check email inbox (and spam folder) for verification link
2. Click the verification link
3. Or use "Resend verification" button on login page

---

## Next Steps

1. **Test the signup flow** with the fixes applied
2. **Verify email verification** works correctly
3. **Test login** after email verification
4. **Test other API endpoints** (profile, appointments, etc.)

---

## Files Modified

1. `frontend/src/pages/Register.jsx`
   - Added age_group mapping
   - Improved error handling
   - Fixed payload logging
   - UI improvements

2. `API_INTEGRATION_GUIDE.md` (New)
   - Comprehensive API documentation
   - All endpoints and their usage
   - Error handling guide

3. `FIXES_APPLIED.md` (This file)
   - Summary of all fixes
   - Testing instructions
   - Troubleshooting guide

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/signup/` - User registration
- `POST /api/auth/verify-email/` - Email verification
- `POST /api/auth/resend-verification/` - Resend verification email
- `POST /api/auth/login/` - User login
- `POST /api/auth/token/refresh/` - Refresh access token
- `GET /api/auth/profile/` - Get user profile
- `PATCH /api/auth/profile/` - Update user profile
- `POST /api/auth/logout/` - User logout

### Search
- `GET /api/search/counsellors/` - Search counsellors

### Resources
- `GET /api/resources/` - List resources

### Appointments
- `GET /api/appointments/` - List appointments
- `POST /api/appointments/create/` - Create appointment
- `GET /api/appointments/<id>/` - Get appointment detail
- `POST /api/appointments/razorpay/create-order/` - Create Razorpay order
- `POST /api/appointments/razorpay/verify-payment/` - Verify Razorpay payment

---

## Environment Variables

### Frontend (.env)
```
VITE_API_BASE=http://localhost:8000
```

### Backend (settings.py)
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay API secret
- `FRONTEND_URL` - Frontend URL for email verification links
- `DEFAULT_FROM_EMAIL` - Email address for sending emails
- `EMAIL_HOST_USER` - SMTP username
- `EMAIL_HOST_PASSWORD` - SMTP password

---

## Notes

1. **Backend must be running** for frontend to work
2. **Email verification is required** before users can log in
3. **HttpOnly cookies** are used for JWT tokens (more secure)
4. **CORS is configured** to allow requests from frontend only
5. **Throttling is enabled** for signup and resend verification endpoints

---

## Support

If you encounter any issues:
1. Check backend server logs
2. Check browser console for errors
3. Verify API endpoints are correct
4. Check CORS configuration
5. Verify database connection
6. Check email configuration (for verification emails)

