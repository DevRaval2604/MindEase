# API Integration Guide - MindEase

This document outlines all API endpoints and their frontend integration.

## Base URL
```
http://localhost:8000
```

## Authentication APIs

### 1. Signup
**Endpoint:** `POST /api/auth/signup/`  
**Frontend:** `frontend/src/pages/Register.jsx`

**Request Payload:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "account_type": "client",  // or "counsellor"
  "password": "password123",
  "confirm_password": "password123",
  "agreed_terms": true,
  "age_group": "18_25",  // Required for client: "under_18", "18_25", "26_40", "41_60", "60_plus"
  // Counsellor-specific fields:
  "license_number": "LIC123",  // Required for counsellor
  "specializations": [1, 2],  // Array of specialization IDs
  "fees_per_session": 1000.00,  // Required for counsellor
  "availability": [1, 2]  // Array of availability slot IDs
}
```

**Response (201 Created):**
```json
{
  "detail": "Account created. Please verify your email to activate the account.",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "client",
    "is_active": false
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "email": ["A user with this email already exists."],
  "phone": ["This phone number is already used."],
  "confirm_password": ["Passwords do not match."]
}
```

### 2. Verify Email
**Endpoint:** `POST /api/auth/verify-email/`  
**Frontend:** `frontend/src/pages/VerifyEmail.jsx`

**Request Payload:**
```json
{
  "token": "verification_token_from_email"
}
```

**Response (200 OK):**
```json
{
  "detail": "Email verified successfully. You can now log in."
}
```

### 3. Resend Verification
**Endpoint:** `POST /api/auth/resend-verification/`  
**Frontend:** `frontend/src/pages/Login.jsx`, `frontend/src/pages/VerifyEmail.jsx`

**Request Payload:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "detail": "Verification email sent."
}
```

### 4. Login
**Endpoint:** `POST /api/auth/login/`  
**Frontend:** `frontend/src/pages/Login.jsx`, `frontend/src/context/AuthContext.jsx`

**Request Payload:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
- Sets HttpOnly cookies: `access_token`, `refresh_token`
- Returns:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "client"
  }
}
```

### 5. Token Refresh
**Endpoint:** `POST /api/auth/token/refresh/`  
**Frontend:** `frontend/src/context/AuthContext.jsx`

**Request Payload:**
```json
{}
```
(Refresh token sent via HttpOnly cookie)

**Response (200 OK):**
- Sets new `access_token` cookie

### 6. Profile
**Endpoint:** `GET /api/auth/profile/`  
**Frontend:** `frontend/src/pages/ClientProfile.jsx`, `frontend/src/pages/CounsellorProfile.jsx`

**Response (200 OK):**
```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "9876543210",
  "age_group": "18_25",  // For client
  "license_number": "LIC123",  // For counsellor
  "specializations": [{"id": 1, "name": "Anxiety"}],  // For counsellor
  "fees_per_session": "1000.00",  // For counsellor
  "availability": [{"id": 1, "name": "weekends"}]  // For counsellor
}
```

**Update Profile:** `PATCH /api/auth/profile/`
**Request Payload:** Same fields as GET response (partial update)

### 7. Logout
**Endpoint:** `POST /api/auth/logout/`  
**Frontend:** `frontend/src/context/AuthContext.jsx`

**Request Payload:**
```json
{}
```

**Response (200 OK):**
```json
{
  "detail": "Logged out."
}
```
- Clears `access_token` and `refresh_token` cookies

---

## Search APIs

### 1. Search Counsellors
**Endpoint:** `GET /api/search/counsellors/`  
**Frontend:** `frontend/src/pages/TherapistDirectory.jsx`

**Query Parameters:**
- `q`: Search string (name/email)
- `specialization`: Comma-separated specialization names (e.g., "Anxiety,Depression")
- `min_fee`: Minimum fee
- `max_fee`: Maximum fee
- `ordering`: "fees_asc", "fees_desc", "name_asc", "name_desc"
- `page`: Page number
- `page_size`: Items per page

**Example:** `GET /api/search/counsellors/?q=john&specialization=Anxiety&min_fee=500&max_fee=2000&ordering=fees_asc&page=1&page_size=10`

**Response (200 OK):**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/search/counsellors/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": {
        "id": 2,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "license_number": "LIC123",
      "specializations": [{"id": 1, "name": "Anxiety"}],
      "fees_per_session": "1000.00",
      "availability": [{"id": 1, "name": "weekends"}],
      "experience": "10 years of experience",
      "is_verified_professional": true
    }
  ]
}
```

---

## Resources APIs

### 1. List Resources
**Endpoint:** `GET /api/resources/`  
**Frontend:** `frontend/src/pages/Resources.jsx`

**Query Parameters:**
- `q`: Search string (title/description)
- `type`: Resource type ("article", "video", "pdf")
- `page`: Page number
- `page_size`: Items per page

**Example:** `GET /api/resources/?q=stress&type=article&page=1&page_size=9`

**Response (200 OK):**
```json
{
  "count": 20,
  "next": "http://localhost:8000/api/resources/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Managing Stress",
      "description": "Learn how to manage stress effectively",
      "resource_type": "article",
      "url": "https://example.com/article",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Appointments APIs

### 1. List Appointments
**Endpoint:** `GET /api/appointments/`  
**Frontend:** `frontend/src/pages/MyAppointments.jsx`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "client": {
      "id": 1,
      "email": "client@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "counsellor": {
      "id": 2,
      "email": "counsellor@example.com",
      "first_name": "Jane",
      "last_name": "Smith"
    },
    "appointment_date": "2024-01-15T10:00:00Z",
    "duration_minutes": 60,
    "amount": "1000.00",
    "payment_status": "paid",
    "status": "confirmed",
    "google_meet_link": "https://meet.google.com/abc-defg-hij",
    "feedback_form_url": "https://forms.google.com/...",
    "notes": "Initial consultation"
  }
]
```

### 2. Create Appointment
**Endpoint:** `POST /api/appointments/create/`  
**Frontend:** `frontend/src/pages/BookAppointment.jsx`

**Request Payload:**
```json
{
  "counsellor_id": 2,
  "appointment_date": "2024-01-15T10:00:00Z",
  "duration_minutes": 60,
  "notes": "Initial consultation"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "client": {...},
  "counsellor": {...},
  "appointment_date": "2024-01-15T10:00:00Z",
  "duration_minutes": 60,
  "amount": "1000.00",
  "payment_status": "pending",
  "status": "pending",
  "notes": "Initial consultation"
}
```

### 3. Get Appointment Detail
**Endpoint:** `GET /api/appointments/<appointment_id>/`  
**Frontend:** `frontend/src/pages/MyAppointments.jsx`

**Response (200 OK):**
```json
{
  "id": 1,
  "client": {...},
  "counsellor": {...},
  "appointment_date": "2024-01-15T10:00:00Z",
  "duration_minutes": 60,
  "amount": "1000.00",
  "payment_status": "paid",
  "status": "confirmed",
  "google_meet_link": "https://meet.google.com/abc-defg-hij",
  "feedback_form_url": "https://forms.google.com/...",
  "notes": "Initial consultation"
}
```

### 4. Create Razorpay Order
**Endpoint:** `POST /api/appointments/razorpay/create-order/`  
**Frontend:** `frontend/src/pages/Payment.jsx`

**Request Payload:**
```json
{
  "appointment_id": 1
}
```

**Response (200 OK):**
```json
{
  "order_id": "order_abc123",
  "amount": 100000,
  "currency": "INR",
  "key": "rzp_test_..."
}
```

### 5. Verify Razorpay Payment
**Endpoint:** `POST /api/appointments/razorpay/verify-payment/`  
**Frontend:** `frontend/src/pages/Payment.jsx`

**Request Payload:**
```json
{
  "appointment_id": 1,
  "razorpay_order_id": "order_abc123",
  "razorpay_payment_id": "pay_abc123",
  "razorpay_signature": "signature_abc123"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "payment_status": "paid",
  "status": "confirmed",
  "google_meet_link": "https://meet.google.com/abc-defg-hij",
  "feedback_form_url": "https://forms.google.com/..."
}
```

---

## Specialization and Availability Mappings

### Specializations (Database IDs)
- 1: "Anxiety"
- 2: "Depression" (Note: DB has typo "Deptression")
- 3: "Relationship Counselling"
- 4: (Other specializations may exist)

### Availability Slots (Database IDs)
- 1: "weekends"
- 2: "weekdays"
- 3: "evenings"
- 4: "morning"

### Age Groups (Client)
- "under_18": "Under 18"
- "18_25": "18-25"
- "26_40": "26-40"
- "41_60": "41-60"
- "60_plus": "60+"

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "field_name": ["Error message"],
  "detail": "General error message"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**403 Forbidden:**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

**404 Not Found:**
```json
{
  "detail": "Not found."
}
```

**429 Too Many Requests:**
```json
{
  "detail": "Request was throttled. Expected available in X seconds."
}
```

**500 Internal Server Error:**
```json
{
  "detail": "A server error occurred."
}
```

---

## CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:5173` (Frontend dev server)
- `http://127.0.0.1:5173`

Cookies are enabled with `CORS_ALLOW_CREDENTIALS = True`

---

## Authentication Flow

1. **Signup**: User registers → Email verification sent → User verifies email → Account activated
2. **Login**: User logs in → JWT tokens stored in HttpOnly cookies → Access token used for authenticated requests
3. **Token Refresh**: Access token expires → Refresh token used to get new access token
4. **Logout**: User logs out → Tokens cleared from cookies

---

## Testing APIs

### Using curl:

```bash
# Signup
curl -X POST http://localhost:8000/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "account_type": "client",
    "password": "password123",
    "confirm_password": "password123",
    "agreed_terms": true,
    "age_group": "18_25"
  }'

# Login (cookies will be set)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Get Profile (with cookies)
curl -X GET http://localhost:8000/api/auth/profile/ \
  -b cookies.txt
```

---

## Frontend API Base URL Configuration

All frontend components use:
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
```

Set environment variable in `.env` file:
```
VITE_API_BASE=http://localhost:8000
```

---

## Notes

1. **HttpOnly Cookies**: Access and refresh tokens are stored in HttpOnly cookies for security
2. **Email Verification**: New users must verify their email before they can log in
3. **Throttling**: Signup and resend verification are throttled to prevent abuse
4. **Password Validation**: Uses Django's password validators (minimum length, complexity, etc.)
5. **Phone Validation**: Must be exactly 10 digits
6. **CORS**: Backend allows credentials and specific origins only

