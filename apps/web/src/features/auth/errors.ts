// Maps Supabase Auth errors to translation keys under `auth.errors.*`.
// Supabase exposes a stable `code` on newer servers; older ones only send an English message,
// so we look at both, then fall back to HTTP status and network detection.

export const AUTH_ERROR_KEYS = [
  'invalidCredentials',
  'emailNotConfirmed',
  'userExists',
  'weakPassword',
  'samePassword',
  'invalidEmail',
  'rateLimit',
  'signupDisabled',
  'noAccount',
  'anonymousDisabled',
  'linkInvalid',
  'differentBrowser',
  'sessionMissing',
  'network',
  'unknown',
] as const;
export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];

const BY_CODE: Record<string, AuthErrorKey> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  user_already_exists: 'userExists',
  email_exists: 'userExists',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  email_address_invalid: 'invalidEmail',
  validation_failed: 'invalidEmail',
  over_email_send_rate_limit: 'rateLimit',
  over_request_rate_limit: 'rateLimit',
  over_sms_send_rate_limit: 'rateLimit',
  signup_disabled: 'signupDisabled',
  email_provider_disabled: 'signupDisabled',
  otp_disabled: 'noAccount',
  user_not_found: 'noAccount',
  anonymous_provider_disabled: 'anonymousDisabled',
  otp_expired: 'linkInvalid',
  flow_state_expired: 'linkInvalid',
  flow_state_not_found: 'differentBrowser',
  bad_code_verifier: 'differentBrowser',
  session_not_found: 'sessionMissing',
  refresh_token_not_found: 'sessionMissing',
};

const BY_MESSAGE: Array<[RegExp, AuthErrorKey]> = [
  [/invalid login credentials/i, 'invalidCredentials'],
  [/email not confirmed/i, 'emailNotConfirmed'],
  [/already (been )?registered|already exists/i, 'userExists'],
  [/should be different from the old password/i, 'samePassword'],
  [/password should be|password is too weak|weak password/i, 'weakPassword'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'invalidEmail'],
  [/rate limit|too many requests|for security purposes, you can only request/i, 'rateLimit'],
  [/anonymous sign-?ins are disabled/i, 'anonymousDisabled'],
  [/signups not allowed for otp/i, 'noAccount'],
  [/signups? (are )?not allowed|signup is disabled/i, 'signupDisabled'],
  [/code verifier|both auth code and code verifier/i, 'differentBrowser'],
  [/expired|invalid.*(token|link|otp)|otp.*invalid/i, 'linkInvalid'],
  [/auth session missing|session.*not found/i, 'sessionMissing'],
  [/failed to fetch|networkerror|network request failed|load failed|fetch failed/i, 'network'],
];

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  name?: unknown;
}

/** Translation key (under `auth.errors`) for any thrown or returned Supabase Auth error. */
export function authErrorKey(err: unknown): AuthErrorKey {
  if (!err) return 'unknown';
  const e = (typeof err === 'object' ? err : { message: String(err) }) as ErrorLike;
  const code = typeof e.code === 'string' ? e.code : '';
  if (code && BY_CODE[code]) return BY_CODE[code];
  if (e.name === 'AuthRetryableFetchError') return 'network';
  const message = typeof e.message === 'string' ? e.message : '';
  for (const [re, key] of BY_MESSAGE) if (re.test(message)) return key;
  if (e.status === 429) return 'rateLimit';
  if (e.status === 0) return 'network';
  return 'unknown';
}
