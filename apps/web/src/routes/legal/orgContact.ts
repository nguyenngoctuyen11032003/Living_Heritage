// Organisation consultation form (/to-chuc). There is no server-side intake for organisations yet
// (connect_requests requires a public item and a signed-in user), so the form only prepares an email in the
// visitor's own mail app when a contact address is configured — it never reports "sent" itself.

export interface OrgContactInput {
  name: string;
  contact: string;
  organisation: string;
  message: string;
  consent: boolean;
}

export type OrgContactErrors = Partial<Record<'name' | 'contact' | 'organisation' | 'message' | 'consent', 'required' | 'contactInvalid'>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s.-]{8,}$/;

/** Shape-checks a mailbox (deliberately loose; the real check is the human who reads it). */
export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function validateOrgContact(input: OrgContactInput): OrgContactErrors {
  const errors: OrgContactErrors = {};
  if (!input.name.trim()) errors.name = 'required';
  const contact = input.contact.trim();
  if (!contact) errors.contact = 'required';
  else if (!EMAIL.test(contact) && !PHONE.test(contact)) errors.contact = 'contactInvalid';
  if (!input.organisation.trim()) errors.organisation = 'required';
  if (!input.message.trim()) errors.message = 'required';
  if (!input.consent) errors.consent = 'required';
  return errors;
}

/** The configured intake mailbox (VITE_CONTACT_EMAIL), or null when none is set. */
export function contactEmail(raw: unknown = import.meta.env.VITE_CONTACT_EMAIL): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return isEmail(v) ? v : null;
}

/** mailto: link carrying the form as subject + body (each line labelled). */
export function buildOrgMailto(to: string, subject: string, lines: Array<[label: string, value: string]>): string {
  const body = lines.map(([label, value]) => `${label}: ${value.trim()}`).join('\n');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
