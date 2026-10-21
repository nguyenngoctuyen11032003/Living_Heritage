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

export function validateConnect(input: ConnectInput): ConnectErrors {
  const errors: ConnectErrors = {};
  if (!input.name.trim()) errors.name = 'required';
  const contact = input.contact.trim();
  if (!contact) errors.contact = 'required';
  else if (contact.length < 3) errors.contact = 'contactInvalid';
  if (!input.message.trim()) errors.message = 'required';
  if (!input.consent) errors.consent = 'consentRequired';
  return errors;
}

/** The stored message carries the chosen format as a short prefix, e.g. "[Hỏi thêm về kinh nghiệm này] …". */
export function composeConnectMessage(formatLabel: string, message: string): string {
  return `[${formatLabel}] ${message.trim()}`.slice(0, 2000);
}
