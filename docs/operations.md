# Operations and future deployment

Hosting is deferred at the owner's request. These are setup instructions, not a deployment confirmation.

## Environment

| Variable                   | Purpose                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `BHARATCODE_API_KEY`       | Required for live calls; developer API key, server-side only                                      |
| `BHARATCODE_MODEL`         | Defaults to `qwen-3.8-27b`; must be eligible for the account                                      |
| `ANALYSIS_ENABLED`         | Set exactly `false` to pause live analysis                                                        |
| `ANALYSIS_SESSION_LIMIT`   | Positive integer accepted-analysis ceiling per process; defaults to 100                           |
| `TRUSTED_CLIENT_IP_HEADER` | Optional; configure only after verifying that the host overwrites it with a single trustworthy IP |

Do not share `.env.local`, print keys, or put keys in `NEXT_PUBLIC_*` variables. The key-check script loads `.env.local` locally. CI needs no API key.

The provider requires eligible API access. Once configured, run `npm run check:api` to test the model list and a tiny real structured response. This checks connectivity/schema compatibility, not debugging quality. Then run the six cases described in `evals/results.md` manually, recording every attempt. Do not run newly generated code before reviewing it.

## Host requirements

- Node.js runtime compatible with the locked dependencies.
- Installation `npx --yes npm@11.6.4 ci`, build `npm run build`, start `npm start`.
- HTTPS, server-side environment secrets, outbound HTTPS to BharatCode, health route `/api/health`.
- Timeout long enough for a 90-second provider deadline plus app overhead. A host with a shorter limit needs an explicitly shorter app deadline or a different hosting configuration.
- Exactly one process and one replica for the current in-memory limiter. Do not treat Next.js's `maxDuration` declaration as proof a selected host allows that duration.
- Confirm same-origin checks with the real public URL behind the host's proxy. Configure request origin using documented host behavior if needed; do not blindly trust forwarded headers.

By default only the global concurrency/allowance controls apply. Configure `TRUSTED_CLIENT_IP_HEADER` only with a host-verified single IP header. Client-supplied or comma-separated forwarded values are not usable identity. Once trusted, the per-client allowance is five accepted analyses per ten minutes.

In-memory counters reset after restart and are separate across processes. The 100-analysis default is not a daily billing cap; up to two provider calls may occur for one analysis. Before scaling or accepting substantial traffic, add shared/durable limits and provider-side usage controls. Do not add replicas with the current limiter.

## Deployment smoke checks

1. Health and the workspace respond over HTTPS.
2. Each saved walkthrough loads and downloads correctly.
3. A tiny real API call succeeds using only first-party code.
4. Provider access errors retain inputs and show a safe message.
5. Cross-origin requests, oversized bodies, concurrency pressure, and the operator kill switch behave correctly.
6. No key appears in built browser assets or the repository. Logs contain no input/output code.
7. Recheck the dependency audit and record any unresolved advisories.

## Troubleshooting

- `API_NOT_CONFIGURED`: add the developer key and restart the local app.
- `API_ACCESS`: check account eligibility, model availability, and key validity with the provider. Never copy the key into a bug report.
- `INVALID_OUTPUT` / `INVALID_PATCH`: the model result failed validation. Improve the expected-behavior description or reduce the example; no patch was accepted.
- `INCOMPLETE_OUTPUT`: the output budget was exhausted or the response did not complete. Do not use a partial patch. Revisit the configured budget after measuring the case.
- `PROVIDER_BUSY`: wait and retry manually; the app already permits one 503 retry.
- `RATE_LIMITED`: wait for concurrency/per-client capacity or inspect the process allowance. Do not restart solely to bypass usage controls.
- npm `edgesOut` crash: use the tested `npx --yes npm@11.6.4 ci` instead of npm 11.5.2.
- Browser tests without Chromium: install the Playwright browser, or set `PLAYWRIGHT_CHANNEL=chrome` when Chrome is installed. Use `npm.cmd` for forwarded CLI arguments in PowerShell if npm's wrapper consumes them.

## Public origin

Set `APP_ORIGIN` to the canonical HTTPS site origin when deploying behind a reverse proxy. Without it, the request protocol and Host header identify the browser-facing origin; forwarded-host headers are not trusted. This accommodates Next.js internal hostnames while retaining exact origin and cross-site checks.
