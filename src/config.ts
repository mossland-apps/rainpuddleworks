export const site = {
  url: 'https://rainpuddleworks.com',
  brand: 'Rainpuddle Website Rescue',
  company: 'Rainpuddle LLC',
  tagline: 'Fix what’s broken. Keep what works.',
  email: 'support@rainpuddleworks.com',
  locality: 'Locally owned in Lane County, Oregon, with service throughout the surrounding region.',
  replyTime: 'within one business day',
  /**
   * Where the request form sends messages (a Formspree form URL, e.g.
   * https://formspree.io/f/abcdwxyz). Set PUBLIC_FORM_ENDPOINT when deploying.
   * Until it is set, the form opens the visitor's email app instead.
   */
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT ?? '',
} as const;
