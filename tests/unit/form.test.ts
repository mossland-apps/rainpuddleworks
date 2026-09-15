import { describe, expect, it } from 'vitest';
import {
  buildMailto,
  buildPayload,
  isSpam,
  normalizeWebsite,
  validateRequest,
  type RequestFields,
} from '../../src/lib/form';

const valid: RequestFields = {
  name: 'Jordan Lee',
  email: 'jordan@example.com',
  website: 'example.com',
  message: 'The contact form on our home page never sends anything.',
  service: 'rescue',
  company: '',
};

describe('normalizeWebsite', () => {
  it('adds https:// when the visitor leaves it off', () => {
    expect(normalizeWebsite('example.com')).toBe('https://example.com');
  });

  it('keeps an existing http or https prefix', () => {
    expect(normalizeWebsite('http://example.com/about')).toBe('http://example.com/about');
    expect(normalizeWebsite('https://www.example.com')).toBe('https://www.example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeWebsite('  www.example.org  ')).toBe('https://www.example.org');
  });

  it('returns null for things that are not web addresses', () => {
    expect(normalizeWebsite('')).toBeNull();
    expect(normalizeWebsite('my website')).toBeNull();
    expect(normalizeWebsite('localhost')).toBeNull();
    expect(normalizeWebsite('ftp://example.com')).toBeNull();
  });
});

describe('validateRequest', () => {
  it('accepts a complete request', () => {
    const result = validateRequest(valid);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('requires a name', () => {
    const result = validateRequest({ ...valid, name: '   ' });
    expect(result.ok).toBe(false);
    expect(result.errors.name).toMatch(/name/i);
  });

  it('requires a real-looking email address', () => {
    expect(validateRequest({ ...valid, email: '' }).errors.email).toBeDefined();
    expect(validateRequest({ ...valid, email: 'jordan@' }).errors.email).toBeDefined();
    expect(validateRequest({ ...valid, email: 'jordan example.com' }).errors.email).toBeDefined();
  });

  it('requires a website address because the review starts from the site', () => {
    const result = validateRequest({ ...valid, website: '' });
    expect(result.errors.website).toMatch(/website/i);
  });

  it('rejects a website value that is not an address', () => {
    expect(validateRequest({ ...valid, website: 'not sure' }).errors.website).toBeDefined();
  });

  it('lets the message be optional, since sending just the URL is fine', () => {
    expect(validateRequest({ ...valid, message: '' }).ok).toBe(true);
  });

  it('limits very long messages', () => {
    const result = validateRequest({ ...valid, message: 'x'.repeat(5001) });
    expect(result.errors.message).toBeDefined();
  });

  it('only allows known services', () => {
    expect(validateRequest({ ...valid, service: 'rebuild' }).ok).toBe(true);
    expect(validateRequest({ ...valid, service: 'custom' }).ok).toBe(true);
    expect(validateRequest({ ...valid, service: 'unsure' }).ok).toBe(true);
    expect(validateRequest({ ...valid, service: 'subscription' as never }).ok).toBe(false);
  });
});

describe('isSpam', () => {
  it('flags submissions where the hidden trap field was filled in', () => {
    expect(isSpam({ ...valid, company: 'Buy links now' })).toBe(true);
    expect(isSpam(valid)).toBe(false);
  });
});

describe('buildPayload', () => {
  it('produces a tidy message for the support inbox', () => {
    const payload = buildPayload(valid);
    expect(payload).toMatchObject({
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      website: 'https://example.com',
      service: 'Website Rescue',
      message: valid.message,
    });
    expect(payload._subject).toBe('Website Rescue request: https://example.com');
    expect(payload._replyto).toBe('jordan@example.com');
  });

  it('labels other services plainly', () => {
    expect(buildPayload({ ...valid, service: 'rebuild' }).service).toBe('Website Rebuild');
    expect(buildPayload({ ...valid, service: 'custom' }).service).toBe('Custom Web Development');
    expect(buildPayload({ ...valid, service: 'unsure' }).service).toBe('Not sure yet');
  });

  it('never forwards the spam trap field', () => {
    expect(buildPayload(valid)).not.toHaveProperty('company');
  });
});

describe('buildMailto', () => {
  it('opens an email to support with the request details filled in', () => {
    const href = buildMailto('support@rainpuddleworks.com', valid);
    expect(href.startsWith('mailto:support@rainpuddleworks.com?')).toBe(true);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('subject')).toBe('Website Rescue request: https://example.com');
    expect(params.get('body')).toContain('Jordan Lee');
    expect(params.get('body')).toContain('https://example.com');
    expect(params.get('body')).toContain(valid.message);
  });

  it('encodes spaces as %20 so every email app reads them correctly', () => {
    const href = buildMailto('support@rainpuddleworks.com', valid);
    expect(href).not.toContain('+');
    expect(href).toContain('%20');
  });
});
