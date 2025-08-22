export const users = [
  {
    name: "Alice Admin",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
  },
  {
    name: "Bob Agent",
    email: "agent@example.com",
    password: "agent123",
    role: "agent",
  },
  {
    name: "Uma User",
    email: "user@example.com",
    password: "user123",
    role: "user",
  },
];

export const kb = [
  {
    title: "How to update payment method",
    body: 'To update your payment method:\n1. Log into your account\n2. Navigate to Account Settings > Billing\n3. Click "Update Payment Method"\n4. Enter your new card details\n5. Click Save\n\nNote: Changes take effect immediately for future charges.',
    tags: ["billing", "payments", "account"],
    status: "publish",
  },
  {
    title: "Troubleshooting 500 errors",
    body: "If you encounter 500 Internal Server Error:\n\n1. **Check server logs** for detailed error messages\n2. **Retry the request** - temporary issues often resolve themselves\n3. **Clear browser cache** and cookies\n4. **Check system status** on our status page\n5. If problem persists, contact support with:\n   - Exact error message\n   - Steps to reproduce\n   - Browser/device info",
    tags: ["technical", "errors", "troubleshooting"],
    status: "publish",
  },
  {
    title: "Tracking your shipment",
    body: "To track your order:\n\n1. Use the tracking link in your confirmation email\n2. Visit our Orders page and enter your order number\n3. Call customer service with your order number\n\n**Tracking Updates:**\n- Processed: Order confirmed and being prepared\n- Shipped: Package handed to carrier\n- In Transit: Package is moving toward destination\n- Delivered: Package successfully delivered\n\nIf tracking shows no updates for 3+ business days, contact support.",
    tags: ["shipping", "delivery", "orders"],
    status: "publish",
  },
  {
    title: "Password Reset Instructions",
    body: 'To reset your password:\n\n1. Go to the login page\n2. Click "Forgot Password?"\n3. Enter your email address\n4. Check your email for reset link\n5. Click the link and enter new password\n\n**Security Tips:**\n- Use at least 8 characters\n- Include uppercase, lowercase, numbers\n- Avoid common words or personal info\n- Don\'t reuse passwords from other sites',
    tags: ["account", "security", "password"],
    status: "publish",
  },
  {
    title: "Refund Policy and Process",
    body: "Our refund policy:\n\n**Eligibility:**\n- Items must be returned within 30 days\n- Items must be in original condition\n- Digital products are non-refundable\n\n**Process:**\n1. Contact support to initiate return\n2. Receive return authorization (RA) number\n3. Package item with RA number\n4. Ship to our returns center\n5. Refund processed within 5-7 business days\n\n**Refund Methods:**\n- Original payment method preferred\n- Store credit available as alternative",
    tags: ["billing", "refunds", "returns"],
    status: "publish",
  },
  {
    title: "API Rate Limiting Guidelines",
    body: "API rate limits:\n\n**Standard Plan:**\n- 1000 requests per hour\n- 10 requests per minute\n\n**Premium Plan:**\n- 5000 requests per hour\n- 50 requests per minute\n\n**Rate Limit Headers:**\n```\nX-RateLimit-Limit: 1000\nX-RateLimit-Remaining: 995\nX-RateLimit-Reset: 1640995200\n```\n\n**Best Practices:**\n- Implement exponential backoff\n- Cache responses when possible\n- Monitor rate limit headers\n- Use webhooks instead of polling",
    tags: ["technical", "api", "development"],
    status: "publish",
  },
];

// export const tickets = [
//   {
//     title: "Refund for double charge",
//     description:
//       "I was charged twice for order #1234. The first charge was on Dec 15th and the second on Dec 16th. Please help me get a refund for one of these charges.",
//     category: "billing",
//   },
//   {
//     title: "App shows 500 error on login",
//     description:
//       "Every time I try to log into the mobile app, I get a 500 internal server error. Stack trace mentions auth module timeout. This started happening yesterday.",
//     category: "tech",
//   },
//   {
//     title: "Where is my package?",
//     description:
//       'My shipment was supposed to arrive 5 days ago but tracking still shows "in transit". Order number is #ORD-5678. Can you check what happened?',
//     category: "shipping",
//   },
//   {
//     title: "Cannot reset password",
//     description:
//       "I've tried multiple times to reset my password but I'm not receiving the reset email. I've checked spam folder too. My email is john@example.com",
//     category: "other",
//   },
//   {
//     title: "API returning 429 errors",
//     description:
//       "Our integration is getting 429 rate limit errors even though we're only making 500 requests per hour. We're on the standard plan. Is there an issue ?",
//     category: "tech",
//   },
//   {
//     title: "How to update payment method ?",
//     description:
//       "I want to change my payment method for future billing. How can I do this ?",
//     category: "billing",
//   },
// ];
