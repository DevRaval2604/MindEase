# Email Verification and Login Error Fixes

## Changes Made

### 1. Email Template - Removed `target="_blank"`

**File:** `backend/apps/accounts/templates/emails/verify_email.html`

**Change:** Removed `target="_blank"` and `rel="noopener"` from verification links.

**Reason:** Prevents forcing links to open in new tabs. Email clients may still open in new tabs, but we no longer force it.

**Before:**
```html
<a class="cta" href="{{ verify_url }}" target="_blank" rel="noopener">Verify your email</a>
```

**After:**
```html
<a class="cta" href="{{ verify_url }}">Verify your email</a>
```

### 2. VerifyEmail Page - Smart Tab Handling

**File:** `frontend/src/pages/VerifyEmail.jsx`

**Change:** Added logic to detect if verification page was opened in a new tab and redirect the original tab.

**How it works:**
- When verification succeeds, checks if `window.opener` exists (meaning it was opened from another tab/window)
- If opener exists, redirects the original tab to login page and closes the verification tab
- If no opener (same tab), does a normal redirect
- Uses URL parameter `?verified=true` to pass verification status to login page

**Code:**
```javascript
if (window.opener && !window.opener.closed && window.opener.location) {
  // Redirect the original tab/window to login page
  window.opener.location.href = '/login?verified=true';
  // Close this verification tab/window
  setTimeout(() => {
    window.close();
  }, 100);
  return;
}
// Normal redirect in the same window/tab
navigate('/login', { 
  state: { 
    message: successMessage,
    verified: true 
  } 
});
```

### 3. Login Page - Enhanced Error Detection

**File:** `frontend/src/pages/Login.jsx`

**Changes:**
1. Added URL parameter detection for cross-tab verification redirects
2. Improved error message detection for unverified email
3. Better error message display with resend verification button

**Error Detection:**
- Checks for "verify your email", "please verify", or "email verification" in error message
- Backend returns: "Please verify your email before logging in."
- Shows clear error message with resend verification button

**Code:**
```javascript
// Check URL parameter (for cross-tab redirects)
const urlParams = new URLSearchParams(location.search);
if (urlParams.get('verified') === 'true') {
  setMessage('Email verified successfully! You can now log in.');
  setIsVerified(true);
}

// Enhanced error detection
if (errorMessage.toLowerCase().includes('verify your email') || 
    errorMessage.toLowerCase().includes('please verify') ||
    errorMessage.toLowerCase().includes('email verification')) {
  setErrors({ form: errorMessage || 'Please verify your email before logging in. Check your inbox for the verification link.' });
  setShowResendVerification(true);
}
```

## How It Works Now

### Scenario 1: Email Link Opens in Same Tab
1. User clicks verification link in email
2. Link opens in the same tab (no `target="_blank"`)
3. Verification succeeds
4. Page redirects to login with success message
5. User sees "Email verified successfully! You can now log in."

### Scenario 2: Email Link Opens in New Tab (Email Client Behavior)
1. User clicks verification link in email
2. Email client opens link in new tab (we can't control this)
3. Verification succeeds
4. System detects `window.opener` exists
5. Original tab is redirected to login page with `?verified=true`
6. New verification tab is closed automatically
7. User sees login page in original tab with success message

### Scenario 3: User Tries to Login Without Verification
1. User enters email and password
2. Clicks "Login"
3. Backend returns error: "Please verify your email before logging in."
4. Frontend detects this error message
5. Shows clear error: "Please verify your email before logging in. Check your inbox for the verification link."
6. Shows "Resend verification email" button
7. User can click to resend verification email

## Testing

### Test 1: Same Tab Verification
1. Register a new account
2. Check email for verification link
3. Click the link (should open in same tab if possible)
4. Should redirect to login page with success message

### Test 2: New Tab Verification (if email client opens in new tab)
1. Register a new account
2. Check email for verification link
3. If email client opens in new tab, verification should:
   - Redirect original tab to login
   - Close verification tab
   - Show success message in original tab

### Test 3: Login Without Verification
1. Register a new account
2. Don't verify email
3. Try to login
4. Should see error: "Please verify your email before logging in."
5. Should see "Resend verification email" button
6. Click button to resend verification email

## Notes

1. **Email Client Behavior:** Some email clients (Gmail, Outlook, etc.) may still open links in new tabs for security reasons. We handle this by detecting and redirecting the original tab.

2. **Browser Security:** Some browsers may block `window.close()` if the window wasn't opened by JavaScript. In this case, the verification tab may not close automatically, but the original tab will still be redirected.

3. **Cross-Origin:** If the email link and the app are on different domains, `window.opener` may not be accessible due to browser security. In this case, it falls back to normal redirect.

4. **Error Messages:** The backend returns clear error messages that the frontend can detect and display appropriately.

## Files Modified

1. `backend/apps/accounts/templates/emails/verify_email.html` - Removed `target="_blank"`
2. `frontend/src/pages/VerifyEmail.jsx` - Added smart tab handling
3. `frontend/src/pages/Login.jsx` - Enhanced error detection and URL parameter support

## Backend Error Response

When user tries to login without verifying email:
```json
{
  "non_field_errors": ["Please verify your email before logging in."]
}
```

Frontend extracts this and shows:
- Clear error message
- Resend verification email button
- Helpful instructions

