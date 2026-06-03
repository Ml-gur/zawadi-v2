# Zawadi Authentication & Profile Workflow Audit

## Current Environment
- **Mode**: Supabase (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set)
- **DB**: Users stored in Supabase `profiles` table, NOT in local `db.json`
- **Server**: Running on port 3000

## Bugs Found & Fixed

### CRITICAL: `/api/auth/me` returns "User not found" in Supabase mode
**File**: `server.ts:500`  
**Root cause**: Always reads from `getDb()` which returns `{ users: [] }` in Supabase mode.  
**Fix**: Added `IS_SUPABASE_MODE` branch that uses `sbGetUser()` instead.  
**Impact**: Session restoration on page refresh was completely broken — user logged out on every refresh.

### CRITICAL: Duplicate email registration overwrites existing user
**File**: `server.ts:271`  
**Root cause**: In Supabase mode, `getDb()` returns empty users array, so the local duplicate check never fires. The `upsertProfile()` call then overwrites the existing record (including password).  
**Fix**: Added `IS_SUPABASE_MODE` branch that uses `sbGetUser()` for the duplicate check.  
**Impact**: Anyone could overwrite any account by registering with the same email.

### MEDIUM: No backend email format validation
**File**: `server.ts:270`  
**Root cause**: Backend accepted any string as email (e.g., "notanemail"). Validation only existed on the frontend.  
**Fix**: Added `emailRegex` validation matching the frontend pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.  
**Impact**: Invalid emails pollute the database.

## Verified Working ✅

| Feature | Status |
|---------|--------|
| Registration: password hashing (bcrypt, 10 rounds) | ✅ |
| Registration: JWT returned + stored in localStorage | ✅ |
| Registration: duplicate email rejected (now fixed) | ✅ |
| Login: correct credentials return 200 + JWT | ✅ |
| Login: wrong password returns 401 "Invalid email or password" | ✅ |
| Login: non-existent email returns 401 (same message, no enumeration) | ✅ |
| Login: rate limited at 5 attempts per 15 minutes | ✅ |
| JWT: secret from env, 32-char minimum, not hardcoded | ✅ |
| JWT: expiry 7 days (regular), 8 hours (admin) | ✅ |
| Auth: Bearer token required on all protected endpoints | ✅ |
| Auth: malformed token → 401 | ✅ |
| Auth: no token → 401 | ✅ |
| Admin: endpoints protected by `verifySuperAdmin` middleware | ✅ |
| Admin: regular user accessing admin endpoint → 403 | ✅ |
| Admin: role check from JWT payload, not request body | ✅ |
| Password: `password_hash` never returned in any response | ✅ |
| Country: stored correctly as empty string (no forced default) | ✅ |
| Logout: clears all state + localStorage tokens | ✅ |

## Potential Improvements (not implemented)

1. **Wizard auto-trigger uses `&&` instead of `||`** (`App.tsx:127`): If any one of `degree_level`, `field_of_study`, `date_of_birth`, `gpa` is set, the wizard won't trigger even if the other 3 are empty. The `country` field is not checked at all.
2. **`fillUserDefaults` spread order**: `{ native_language: "English", ...user }` — the user's value overwrites the default, which is correct behavior (not a bug as previously thought).
3. **Admin login rate limit is shared** with regular login rate limit (same IP-based `authLimiter`).
4. **Wizard `onDismiss` sets `profileReady: true`** — user can skip the wizard permanently.
