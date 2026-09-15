export const services = {
  rescue: 'Website Rescue',
  rebuild: 'Website Rebuild',
  custom: 'Custom Web Development',
  unsure: 'Not sure yet',
} as const;

export type ServiceKey = keyof typeof services;

export interface RequestFields {
  name: string;
  email: string;
  website: string;
  message: string;
  service: ServiceKey;
  /** Hidden trap field. People never see it; bots tend to fill it in. */
  company: string;
}

export type FieldErrors = Partial<Record<'name' | 'email' | 'website' | 'message' | 'service', string>>;

export const MAX_MESSAGE_LENGTH = 5000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HOST_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

/** Turns what a visitor typed into a full web address, or null if it isn't one. */
export function normalizeWebsite(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return null;
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!HOST_PATTERN.test(url.hostname)) return null;
    return hasScheme ? trimmed : candidate;
  } catch {
    return null;
  }
}

export function validateRequest(fields: RequestFields): { ok: boolean; errors: FieldErrors } {
  const errors: FieldErrors = {};

  if (!fields.name.trim()) {
    errors.name = 'Please tell us your name.';
  }
  if (!EMAIL_PATTERN.test(fields.email.trim())) {
    errors.email = 'Please enter an email address we can reply to.';
  }
  if (!fields.website.trim()) {
    errors.website = 'Please enter your website address.';
  } else if (!normalizeWebsite(fields.website)) {
    errors.website = 'That doesn’t look like a website address. Try something like yourbusiness.com.';
  }
  if (fields.message.length > MAX_MESSAGE_LENGTH) {
    errors.message = `Please keep this under ${MAX_MESSAGE_LENGTH.toLocaleString('en-US')} characters.`;
  }
  if (!Object.hasOwn(services, fields.service)) {
    errors.service = 'Please choose a service.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function isSpam(fields: RequestFields): boolean {
  return fields.company.trim() !== '';
}

function subjectFor(fields: RequestFields): string {
  const website = normalizeWebsite(fields.website) ?? fields.website.trim();
  return `${services[fields.service]} request: ${website}`;
}

export function buildPayload(fields: RequestFields) {
  return {
    name: fields.name.trim(),
    email: fields.email.trim(),
    website: normalizeWebsite(fields.website) ?? fields.website.trim(),
    service: services[fields.service],
    message: fields.message.trim(),
    _subject: subjectFor(fields),
    _replyto: fields.email.trim(),
  };
}

export function buildMailto(to: string, fields: RequestFields): string {
  const payload = buildPayload(fields);
  const body = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Website: ${payload.website}`,
    `Service: ${payload.service}`,
    '',
    payload.message || '(No details added. Please take a look at the site.)',
  ].join('\n');
  const query = `subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${to}?${query}`;
}
