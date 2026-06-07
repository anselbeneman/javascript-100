# Security Policy

JavaScript 100 is a static portfolio of standalone browser projects. It does not handle accounts, payments, private user data, or server-side secrets.

Production is configured with security headers in `vercel.json`. Projects should keep runtime assets local unless the policy is deliberately updated and validated.

## Reporting

Open a GitHub issue if you find a security-relevant problem such as:

- A project loading unexpected remote code.
- A route exposing generated files incorrectly.
- A browser API behavior that could mislead users or leak local data.
- A dependency or build workflow issue that affects the published site.

Do not include private credentials, tokens, cookies, or personal data in reports. Include the affected route, browser, reproduction steps, and whether `pnpm run validate` passes.

## Supported Versions

Only the current `main` branch is supported.
