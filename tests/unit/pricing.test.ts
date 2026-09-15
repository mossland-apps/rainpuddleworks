import { describe, expect, it } from 'vitest';
import { formatUSD, rescue, rebuild } from '../../src/lib/pricing';

describe('formatUSD', () => {
  it('formats whole dollars without cents', () => {
    expect(formatUSD(349)).toBe('$349');
  });

  it('adds thousands separators', () => {
    expect(formatUSD(1495)).toBe('$1,495');
  });

  it('rejects non-whole or negative amounts', () => {
    expect(() => formatUSD(12.5)).toThrow();
    expect(() => formatUSD(-1)).toThrow();
  });
});

describe('Website Rescue pricing', () => {
  it('is $349 flat', () => {
    expect(rescue.total).toBe(349);
  });

  it('splits into $175 to start and $174 at completion', () => {
    expect(rescue.deposit).toBe(175);
    expect(rescue.balance).toBe(174);
  });

  it('deposit and balance always add up to the flat price', () => {
    expect(rescue.deposit + rescue.balance).toBe(rescue.total);
  });

  it('caps the scope at 5 pages and 10 fixes with one revision round', () => {
    expect(rescue.maxPages).toBe(5);
    expect(rescue.maxFixes).toBe(10);
    expect(rescue.revisionRounds).toBe(1);
    expect(rescue.followUpDays).toBe(7);
    expect(rescue.typicalBusinessDays).toBe(3);
  });
});

describe('Website Rebuild pricing', () => {
  it('starts from $1,495', () => {
    expect(rebuild.from).toBe(1495);
  });

  it('lists add-on prices', () => {
    expect(rebuild.addOns.extraPage).toBe(125);
    expect(rebuild.addOns.copyRewritePerPage).toBe(75);
  });

  it('costs meaningfully more than a Rescue, so it is never a Rescue upsell tier', () => {
    expect(rebuild.from).toBeGreaterThan(rescue.total * 3);
  });
});
