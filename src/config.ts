export const site = {
  url: 'https://rainpuddleworks.com',
  brand: 'Rainpuddle Website Rescue',
  company: 'Rainpuddle LLC',
  tagline: 'Fix what’s broken. Keep what works.',
  email: 'support@rainpuddleworks.com',
  locality: 'Locally owned in Lane County, Oregon, with service throughout the surrounding region.',
  replyTime: 'within one business day',
  /**
   * Formspree form that delivers requests to the support inbox. Set
   * PUBLIC_FORM_ENDPOINT to point at a different form (e.g. for testing).
   */
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || 'https://formspree.io/f/xppzvnyv',
} as const;
