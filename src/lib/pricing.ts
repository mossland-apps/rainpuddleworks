/** Formats a whole-dollar amount as US currency, e.g. 1495 -> "$1,495". */
export function formatUSD(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Expected a whole, non-negative dollar amount, got ${amount}`);
  }
  return `$${amount.toLocaleString('en-US')}`;
}

export const rescue = {
  total: 349,
  deposit: 175,
  balance: 174,
  maxPages: 5,
  maxFixes: 10,
  revisionRounds: 1,
  followUpDays: 7,
  typicalBusinessDays: 3,
} as const;

export const rebuild = {
  from: 1495,
  maxPages: 5,
  revisionRounds: 2,
  addOns: {
    extraPage: 125,
    copyRewritePerPage: 75,
  },
} as const;
