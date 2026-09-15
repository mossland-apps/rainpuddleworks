import { formatUSD, rescue } from '../lib/pricing';

export const problemFixes = [
  { problem: 'Visitors can’t contact you', fix: 'Repair forms, buttons, email links, or CTAs' },
  { problem: 'The site breaks on phones', fix: 'Correct major responsive layout problems' },
  { problem: 'Pages feel slow or unstable', fix: 'Address obvious image and page-speed issues' },
  { problem: 'Navigation goes nowhere', fix: 'Repair broken links, menus, and missing images' },
  { problem: 'The site looks neglected', fix: 'Clean up headings, metadata, accessibility, and small wording issues' },
];

export const included = [
  `Review of up to ${rescue.maxPages} existing website pages`,
  `Up to ${rescue.maxFixes} agreed website fixes`,
  'Mobile and responsive-layout corrections',
  'Broken link, button, image, and navigation fixes',
  'Contact-form and call-to-action repairs',
  'Basic page-speed and oversized-image improvements',
  'Basic title, heading, and metadata cleanup',
  'Basic accessibility corrections',
  'Small wording and content corrections',
  'Desktop and mobile testing',
  'A before-and-after summary of completed work',
  'One revision round',
  `${rescue.followUpDays} days of follow-up coverage for problems directly related to our completed repairs`,
];

export const noStrings = [
  'No monthly contract.',
  'No long-term retainer.',
  'No surprise hourly bill.',
  'No unnecessary redesign.',
];

export const steps = [
  {
    title: 'Send Us Your Website',
    body: ['Tell us what has been bothering you—or simply send us the URL and let us take a look.'],
  },
  {
    title: 'We Identify the Problems',
    body: ['We review the site and create a clear repair scope.', 'You’ll know what we’re fixing before work begins.'],
  },
  {
    title: `Pay ${formatUSD(rescue.deposit)} to Start`,
    body: [
      'Once the scope is approved, the first half of the project price is due.',
      'We’ll email you an invoice you can pay online.',
    ],
  },
  {
    title: 'We Rescue the Site',
    body: [
      `Most Website Rescue projects are completed within ${rescue.typicalBusinessDays} business days after we receive the access needed to perform the work.`,
    ],
  },
  {
    title: 'Review the Repairs',
    body: [
      'You’ll receive a summary of what changed and can request one revision round.',
      `The remaining ${formatUSD(rescue.balance)} is due when the project is complete.`,
    ],
  },
];

export const goodFitMaybes = [
  'Maybe the mobile version looks wrong.',
  'Maybe customers struggle to contact you.',
  'Maybe something broke months ago and nobody ever fixed it.',
];

export const platforms = [
  { name: 'WordPress', note: '' },
  { name: 'Squarespace, Wix, and Weebly', note: '' },
  { name: 'Shopify', note: 'small, contained fixes only' },
  { name: 'Plain hand-coded or older custom sites', note: '' },
];

export const notIncluded = [
  'Complete website redesigns',
  'New brand identity development',
  'Large-scale copywriting',
  'Major online-store rebuilds',
  'Custom web applications',
  'Domain or hosting migrations',
  'Paid themes, plugins, software, or licenses',
];

export const faqs = [
  {
    q: 'Do I pay anything before you look at my site?',
    a: [
      `No. The first review is free. We look at your site, write a clear repair scope, and you approve it before the ${formatUSD(rescue.deposit)} deposit is due. If you decide not to go ahead, you owe nothing.`,
    ],
  },
  {
    q: `What if my site has more than ${rescue.maxFixes} problems?`,
    a: [
      `We put the most important problems first, so the ${rescue.maxFixes} agreed fixes go where they make the biggest difference. We’ll tell you plainly what’s left over and what your options are before you pay anything.`,
    ],
  },
  {
    q: 'Will you change how my website looks?',
    a: [
      'Only where a repair calls for it, like fixing a layout that breaks on phones. Your design, platform, and content stay yours. Rescue repairs the site you have; it isn’t a redesign.',
    ],
  },
  {
    q: 'What do you need from me to do the work?',
    a: [
      `Access to make changes, usually a login on your website platform. WordPress, Squarespace, Wix, and Shopify all let you add a separate account for us, so you don’t have to share your own password. We’ll tell you exactly what’s needed, and the ${rescue.typicalBusinessDays}-business-day turnaround starts once that access is in place.`,
    ],
  },
  {
    q: `What does the ${rescue.followUpDays} days of follow-up cover?`,
    a: [
      `If something directly related to a repair we made stops working within ${rescue.followUpDays} days of completion, we’ll fix it at no charge. It doesn’t cover new problems unrelated to our work or new requests.`,
    ],
  },
];
