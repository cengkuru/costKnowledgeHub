# Enhanced Authentication API Documentation

## Overview

The Cost Knowledge Hub API now includes enhanced authentication with token-based access control, token revocation capabilities, and secure password reset functionality.

---

## Authentication Flow

### Token Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Token Pair System                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────┐      ┌──────────────────────────┐ │
│  │  Access Token (15 min)   │      │ Refresh Token (7 days)   │ │
│  │                          │      │                          │ │
│  │ • Short-lived            │      │ • Long-lived             │ │
│  │ • Used for API requests  │      │ • Used only for refresh  │ │
│  │ • Contains: userId,      │      │ • Contains: userId,      │ │
│  │   email, role, jti       │      │   tokenFamily, jti       │ │
│  │ • Signed with JWT_SECRET │      │ • Signed with JWT_SECRET │ │
│  └──────────────────────────┘      └──────────────────────────┘ │
│           ↓                                    ↓                 │
│      Blacklist checked                   Never blacklisted       │
│      on each request                      (only expires)         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. User Registration

**Endpoint:** `POST /api/auth/register`

**Rate Limit:** 5 requests per 15 minutes

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number

**Success Response (201):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2025-11-29T12:00:00Z"
}
```

**Error Responses:**
```json
// 400 - Invalid input
{
  "error": "Validation error",
  "details": "Password must be at least 8 characters"
}

// 409 - Email already exists
{
  "error": "User with this email already exists"
}
```

---

### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Rate Limit:** 5 requests per 15 minutes

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Token Structure:**

Access Token Payload:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "user",
  "jti": "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  "type": "access",
  "iat": 1701245756,
  "exp": 1701246656
}
```

Refresh Token Payload:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "tokenFamily": "f1e2d3c4-b5a6-47g8-h9i0-j1k2l3m4n5o6",
  "jti": "b2c3d4e5-f6g7-48h9-i0j1-k2l3m4n5o6p7",
  "type": "refresh",
  "iat": 1701245756,
  "exp": 1702454356
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{
  "error": "Invalid credentials"
}

// 400 - Missing fields
{
  "error": "Email and password required"
}
```

---

### 3. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`

**Rate Limit:** 10 requests per 15 minutes

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Responses:**
```json
// 401 - Invalid/expired refresh token
{
  "error": "Invalid or expired refresh token"
}

// 400 - Missing refresh token
{
  "error": "Refresh token required"
}
```

---

### 4. Get Current User Profile

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "createdAt": "2025-11-29T12:00:00Z"
}
```

**Error Responses:**
```json
// 401 - Missing or invalid token
{
  "error": "Authorization header required"
}

// 401 - Token revoked
{
  "error": "Token has been revoked"
}
```

---

### 5. Update User Profile

**Endpoint:** `PUT /api/auth/me`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "newemail@example.com"
}
```

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "newemail@example.com",
  "name": "Jane Doe",
  "role": "user",
  "createdAt": "2025-11-29T12:00:00Z"
}
```

---

### 6. Logout (Current Session)

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
```json
// 401 - Not authenticated
{
  "error": "Not authenticated"
}
```

**Side Effects:**
- Current access token added to blacklist
- Token cannot be used for future requests
- Other active sessions remain valid

---

### 7. Logout All Sessions

**Endpoint:** `POST /api/auth/logout-all`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "message": "All sessions logged out successfully"
}
```

**Side Effects:**
- ALL tokens for the user added to blacklist
- User must login again to access API
- Useful for security incidents

---

### 8. Request Password Reset

**Endpoint:** `POST /api/auth/forgot-password`

**Rate Limit:** 3 requests per 1 hour

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z"
}
```

**Security Notes:**
- Response is the same whether email exists or not (prevents email enumeration)
- Token valid for 24 hours only
- Token is one-time use

---

### 9. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Rate Limit:** 5 requests per 15 minutes

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z",
  "newPassword": "NewSecurePassword456"
}
```

**New Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number

**Success Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
```json
// 400 - Invalid/expired reset token
{
  "error": "Invalid or expired password reset token"
}

// 400 - Password doesn't meet requirements
{
  "error": "Password validation failed: Password must contain a number"
}

// 404 - User not found
{
  "error": "User not found"
}
```

**Side Effects:**
- Password updated in database
- ALL existing tokens revoked (user must login again)
- Reset token deleted

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | User successfully registered |
| 400 | Bad Request | Invalid input, missing fields |
| 401 | Unauthorized | Missing/invalid token, revoked token |
| 403 | Forbidden | Insufficient permissions |
| 409 | Conflict | Email already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### Error Response Format

```json
{
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2025-11-29T12:00:00Z"
}
```

---

## Token Blacklist System

### How It Works

1. **Token Revocation**
   - When user logs out or token is revoked, JTI (unique ID) is added to blacklist
   - Blacklist entry includes expiration date of the original token

2. **Automatic Cleanup**
   - Expired entries removed from blacklist every hour
   - No manual cleanup needed

3. **Verification**
   - On every request, middleware checks if token JTI is in blacklist
   - If revoked, request rejected with 401 error

4. **Blacklist Persistence**
   - In MVP: In-memory Map (reset on server restart)
   - Production: Can be upgraded to Redis for distributed systems

---

## Security Best Practices

### For Clients

1. **Token Storage**
   ```javascript
   // Store tokens securely
   localStorage.setItem('accessToken', accessToken); // For SPA
   // OR use secure httpOnly cookies (better)
   ```

2. **Token Refresh**
   ```javascript
   // Refresh token before expiration
   const REFRESH_INTERVAL = 14 * 60 * 1000; // Refresh every 14 min
   setInterval(() => {
     if (localStorage.getItem('refreshToken')) {
       refreshAccessToken();
     }
   }, REFRESH_INTERVAL);
   ```

3. **Request Headers**
   ```javascript
   // Include token in every authenticated request
   headers: {
     'Authorization': `Bearer ${accessToken}`,
     'Content-Type': 'application/json'
   }
   ```

4. **Handle Token Expiration**
   ```javascript
   if (error.status === 401) {
     // Try to refresh token
     const newAccessToken = await refreshAccessToken();
     if (newAccessToken) {
       // Retry request with new token
       return retryRequest(newAccessToken);
     } else {
       // Refresh failed, redirect to login
       navigateToLogin();
     }
   }
   ```

### For Server

1. **Environment Variables**
   ```bash
   JWT_SECRET=your-very-secure-secret-key-at-least-32-characters
   ```

2. **Rate Limiting**
   - Auth endpoints have built-in rate limiting
   - Login: 5 requests per 15 minutes
   - Refresh: 10 requests per 15 minutes
   - Password Reset: 3 requests per 1 hour

3. **HTTPS Only**
   - Always use HTTPS in production
   - Never transmit tokens over HTTP

4. **Token Expiration**
   - Access tokens: 15 minutes (short-lived)
   - Refresh tokens: 7 days (long-lived)
   - Reset tokens: 24 hours

---

## Integration Examples

### JavaScript/TypeScript

```typescript
// 1. Login
async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const { accessToken, refreshToken } = await response.json();

  // Store tokens securely (httpOnly cookies preferred)
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

// 2. Make authenticated request
async function getProfile() {
  const response = await fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });

  if (response.status === 401) {
    // Token expired or revoked, try to refresh
    await refreshToken();
    return getProfile(); // Retry
  }

  return response.json();
}

// 3. Refresh token
async function refreshToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: localStorage.getItem('refreshToken')
    })
  });

  const { accessToken } = await response.json();
  localStorage.setItem('accessToken', accessToken);
}

// 4. Logout
async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
```

### cURL Examples

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer {accessToken}"
```

**Refresh Token:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "{refreshToken}"
  }'
```

**Logout:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {accessToken}"
```

---

## Testing

### Manual Testing Checklist

- [ ] User can register with valid credentials
- [ ] User cannot register with duplicate email
- [ ] User can login and receive token pair
- [ ] Access token works for authenticated endpoints
- [ ] Refresh token generates new access token
- [ ] Logout revokes current token
- [ ] Logout-all revokes all user tokens
- [ ] Password reset requires valid token
- [ ] Password reset revokes all tokens
- [ ] Revoked tokens are rejected on requests

---

## Troubleshooting

### Common Issues

**"Invalid or expired token" on valid token**
- Token might be in blacklist (revoked)
- Token might have expired
- Check token format: "Bearer {token}"

**"Refresh token invalid"**
- Refresh token has 7-day expiration
- Cannot use access token to refresh
- Refresh token is one-time use

**"Rate limit exceeded"**
- Auth endpoints have rate limiting
- Wait before retrying
- Implement exponential backoff in client

---

## Migration Guide

### From Old Auth System

Old System:
```json
// Old login response
{
  "token": "eyJhbGc...",
  "user": { ... }
}

// Old requests
Authorization: Bearer {token}
```

New System:
```json
// New login response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "user": { ... }
}

// Requests remain the same
Authorization: Bearer {accessToken}
```

**Migration Steps:**
1. Update login endpoint to use `accessToken` from response
2. Implement token refresh before expiration
3. Handle 401 errors with token refresh
4. Store both `accessToken` and `refreshToken`

---

## Support

For issues or questions about the authentication system:
1. Check the troubleshooting section above
2. Review error messages carefully
3. Enable debug logging
4. Contact the development team

---

**Last Updated:** November 29, 2025
**Version:** 1.0.0
