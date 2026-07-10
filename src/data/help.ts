export type HelpSection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

export const helpSections: HelpSection[] = [
  {
    title: 'Account Activation',
    body: [
      'Your account must be activated by the BlueAnt ERP administrator before first-time access.',
      'If you have received an activation email or SMS, use the instructions provided to complete your setup.',
    ],
  },
  {
    title: 'Login Issues',
    body: [
      'Confirm that you are using your registered email address or mobile number and the correct password.',
      'If the page is not loading properly, refresh the browser or reopen the app and try again.',
    ],
    bullets: ['Check for Caps Lock', 'Clear saved passwords if the browser autofill is stale', 'Try a supported browser version'],
  },
  {
    title: 'Forgot Password',
    body: [
      'Use the Forgot Password option on the login screen to request a reset link or verification step.',
      'If you do not receive the message, check your spam folder and confirm your registered contact details with IT support.',
    ],
  },
  {
    title: 'Account Locked',
    body: [
      'Accounts may be temporarily locked after multiple unsuccessful login attempts or for security review.',
      'Contact IT support to verify your identity and request a reset or unlock.',
    ],
  },
  {
    title: 'Browser Requirements',
    body: [
      'BlueAnt ERP is optimized for modern browsers on Android, iPad, tablet, and desktop environments.',
      'For the best experience, keep JavaScript enabled and avoid private browsing modes if they interfere with saved sessions.',
    ],
  },
  {
    title: 'Frequently Asked Questions',
    bullets: [
      'Can I use the same account on multiple devices? Yes, subject to company policy and access controls.',
      'What should I do if a page looks incomplete? Refresh once and then contact support if the issue continues.',
      'Who should I contact for access changes? Your supervisor or the IT support team.',
    ],
  },
  {
    title: 'Contact IT Support',
    body: [
      'If you still cannot access your account, contact the support team with your full name, registered mobile number, and the issue you are seeing.',
    ],
  },
];
