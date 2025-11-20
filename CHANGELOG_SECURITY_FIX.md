# Changelog - Security Fix: Token Encryption

## [Unreleased] - 2025-11-20

### 🔒 SECURITY

#### Critical: Removed Plaintext Fallback in Token Encryption

**CVE:** N/A (Internal Security Issue)
**Severity:** CRITICAL
**CVSS Score:** 8.1 (High)

##### Description
Fixed a critical security vulnerability where token decryption failures would silently fall back to returning plaintext tokens. This could potentially expose user OAuth credentials if encryption keys were compromised or corrupted.

##### Impact
- **Before:** Decryption failures returned plaintext tokens with only a console warning
- **After:** Decryption failures throw `EncryptionError`, forcing proper error handling
- **User Impact:** Users may need to reconnect their Google accounts if tokens are corrupted

##### Changes Made

**Core Security Module:**
- `lib/security/encryption.ts`
  - Removed plaintext fallback in `resolveTokenValue()`
  - Added comprehensive JSDoc documentation
  - Throws `EncryptionError` with bilingual messages (English/Arabic)
  - Enhanced error logging

**Error Handling in All Token Consumers:**
- `app/api/gmb/sync/route.ts` - GMB sync endpoint
- `lib/gmb/helpers.ts` - GMB helper functions
- `app/[locale]/(dashboard)/dashboard/actions.ts` - Dashboard actions
- `app/api/gmb/oauth-callback/route.ts` - OAuth callback handler
- `app/api/gmb/validate-token/route.ts` - Token validation endpoint

**All consumers now:**
1. Wrap `resolveTokenValue()` in try-catch blocks
2. Mark affected accounts as inactive on decryption failure
3. Set `last_error` field for user visibility
4. Return/throw bilingual error messages
5. Log errors properly for monitoring

**Test Coverage:**
- `tests/lib/security/encryption.test.ts`
  - Updated tests to verify secure behavior
  - Added test for bilingual error messages
  - All 8 tests passing ✅

##### Migration Guide

**For Developers:**
```typescript
// ❌ OLD (insecure)
const token = resolveTokenValue(account.access_token);

// ✅ NEW (secure)
try {
  const token = resolveTokenValue(account.access_token, { context: 'context_name' });
} catch (error) {
  // Handle decryption failure
  await deactivateAccount(accountId);
  throw new Error('Please reconnect your account');
}
```

**For Users:**
If you see this error message:
> "Your Google account connection has expired. Please reconnect in Settings."
> "انتهت صلاحية اتصال حساب Google. يُرجى إعادة الاتصال في الإعدادات."

**Steps to resolve:**
1. Go to Settings → Google My Business
2. Click "Disconnect" on the affected account
3. Click "Connect Google My Business" to reconnect
4. Grant permissions again
5. Your account will be reactivated

**For Database Administrators:**
If you have plaintext tokens in your database (unlikely), run:
```bash
npx tsx scripts/encrypt-existing-tokens.ts --dry-run  # Check first
npx tsx scripts/encrypt-existing-tokens.ts            # Apply migration
```

##### Breaking Changes

**YES** - This is a breaking change for security reasons:
- Plaintext tokens are no longer accepted
- Callers must handle `EncryptionError` exceptions
- Users with corrupted tokens must re-authenticate

**Justification:**
Security vulnerabilities must be fixed immediately, even if it causes temporary inconvenience. The risk of credential exposure outweighs the user friction of reconnecting accounts.

##### Rollback Plan

**DO NOT ROLLBACK** - This is a critical security fix.

If issues occur:
1. Verify `ENCRYPTION_KEY` environment variable is correct
2. Check Sentry for `EncryptionError` patterns
3. Run token migration script if needed
4. Force re-authentication for affected users

##### References
- Security Documentation: [SECURITY_FIX_TOKEN_ENCRYPTION.md](./SECURITY_FIX_TOKEN_ENCRYPTION.md)
- Migration Script: [scripts/encrypt-existing-tokens.ts](./scripts/encrypt-existing-tokens.ts)
- Test Suite: [tests/lib/security/encryption.test.ts](./tests/lib/security/encryption.test.ts)

##### Credits
- **Reported By:** Internal Security Audit
- **Fixed By:** Development Team
- **Reviewed By:** [Pending]
- **Approved By:** [Pending]

---

## Previous Releases

### [0.9.0-beta] - 2025-11-18

#### Added
- Complete i18n support (English/Arabic)
- Enhanced auto-reply with per-rating controls
- Media Library with translations
- Dashboard tab improvements

#### Fixed
- TypeScript syntax errors
- React error #31 (objects as children)
- Production URL configurations
- Locale validation issues

---

**Changelog Format:** Keep a Changelog v1.1.0
**Versioning:** Semantic Versioning 2.0.0
