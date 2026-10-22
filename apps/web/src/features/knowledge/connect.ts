// Pure helpers for the "Đề nghị trao đổi" form (connect_requests constraints: name 1–80, contact 3–200, message 1–2000).

export const CONNECT_FORMATS = ['question', 'learn', 'invite', 'other'] as const;
export type ConnectFormat = (typeof CONNECT_FORMATS)[number];

export interface ConnectInput {
  name: string;
  contact: string;
  format: ConnectFormat;
  message: string;
  consent: boolean;
}

export type ConnectErrorCode = 'required' | 'contactInvalid' | 'consentRequired';
export type ConnectErrors = Partial<Record<'name' | 'contact' | 'message' | 'consent', ConnectErrorCode>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A plausible email address or phone number (8–15 digits; spaces, dots, dashes, parentheses and a leading + allowed). */
export function isPlausibleContact(raw: string): boolean {
  const v = raw.trim();
  if (EMAIL_RE.test(v)) return true;
  if (!/^\+?[\d\s().-]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, '').length;
  return digits >= 8 && digits <= 15;
}

export function validateConnect(input: ConnectInput): ConnectErrors {
  const errors: ConnectErrors = {};
  if (!input.name.trim()) errors.name = 'required';
  const contact = input.contact.trim();
  if (!contact) errors.contact = 'required';
  else if (!isPlausibleContact(contact)) errors.contact = 'contactInvalid';
  if (!input.message.trim()) errors.message = 'required';
  if (!input.consent) errors.consent = 'consentRequired';
  return errors;
}

/** The stored message carries the chosen format as a short prefix, e.g. "[Hỏi thêm về kinh nghiệm này] …". */
export function composeConnectMessage(formatLabel: string, message: string): string {
  return `[${formatLabel}] ${message.trim()}`.slice(0, 2000);
}

// ---- Public page /ket-noi (interest form) ----

export const CONNECT_PLANS = ['month', 'year', 'book'] as const;
export type ConnectPlan = (typeof CONNECT_PLANS)[number];

/** `?plan=` from the pricing cards; anything unknown is ignored. */
export function parseConnectPlan(value: string | null | undefined): ConnectPlan | null {
  return (CONNECT_PLANS as readonly string[]).includes(value ?? '') ? (value as ConnectPlan) : null;
}

export interface ConnectPageInput extends ConnectInput {
  topic: string;
}

export type ConnectPageErrors = ConnectErrors & { topic?: ConnectErrorCode };

/** connect_requests needs a signed-in user and a published item; everything else goes to interest_requests (guests allowed). */
export function connectTarget(input: { itemId: string; signedIn: boolean }): 'connect_requests' | 'interest_requests' {
  return input.itemId && input.signedIn ? 'connect_requests' : 'interest_requests';
}

/** Same rules as the item dialog, except the message is optional and a topic is required. */
export function validateConnectPage(input: ConnectPageInput): ConnectPageErrors {
  const errors: ConnectPageErrors = validateConnect({ ...input, message: input.message.trim() || '-' });
  if (!input.topic.trim()) errors.topic = 'required';
  return errors;
}

/** "[format] [plan] Chủ đề: … ⏎ message", capped to the 2000-char column limit. */
export function composeConnectPageMessage(parts: { formatLabel: string; topicLabel: string; topic: string; planLabel?: string | null; message: string }): string {
  const head = `[${parts.formatLabel}]${parts.planLabel ? ` [${parts.planLabel}]` : ''} ${parts.topicLabel}: ${parts.topic.trim()}`;
  const body = parts.message.trim();
  return (body ? `${head}\n${body}` : head).slice(0, 2000);
}
