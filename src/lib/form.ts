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

const FIELD_MESSAGES: FieldErrors = {
  name: 'Please tell us your name.',
  email: 'Please enter an email address we can reply to.',
  website: 'Please check your website address.',
  message: 'Please check your message.',
};

const FORMSPREE_FIELD_ALIASES: Record<string, keyof FieldErrors> = {
  name: 'name',
  email: 'email',
  _replyto: 'email',
  website: 'website',
  message: 'message',
};

export const SEND_FAILED_MESSAGE = 'Sorry, your request didn’t go through. Please try again, or email us at';

/**
 * Formspree rejects submissions with a JSON body like
 * { errors: [{ field?: 'email', code, message }] }. Field problems are shown
 * beside the matching input in our own words; anything else becomes one message.
 */
export function errorsFromFormspree(body: unknown): { fieldErrors: FieldErrors; formError: string | null } {
  const fieldErrors: FieldErrors = {};
  let unmatched = false;

  const errors = (body as { errors?: unknown } | null)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    for (const error of errors) {
      const field = FORMSPREE_FIELD_ALIASES[(error as { field?: string })?.field ?? ''];
      if (field) fieldErrors[field] = FIELD_MESSAGES[field];
      else unmatched = true;
    }
  } else {
    unmatched = true;
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  return { fieldErrors, formError: hasFieldErrors && !unmatched ? null : SEND_FAILED_MESSAGE };
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
