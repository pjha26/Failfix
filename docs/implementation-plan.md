# FailFix — implementation and shipping plan

> Provider migration note — 25 October 2026: the current implementation uses native Groq SDK Chat Completions and GROQ_API_KEY. This document remains the original BharatCode planning baseline; use README.md and operations.md for current setup.

Prepared 22 October 2026. Planning baseline: submit by 25 October, with a working public build ready on 24 October. This is an implementation plan; development, live API verification, hosting, and submission have not happened yet.

## 1. Product promise

**Turn a failing TypeScript test into an evidence-linked explanation, a reviewable source patch, and a proposed regression test.**

Target user: a student or developer who has a small reproducible bug and needs help understanding and fixing it. The initial supported workflow is TypeScript utility code tested with Vitest. Choosing one language and test framework is a planning assumption, not a hackathon requirement.

The user provides one source file, one existing test file, failing output, and optionally the intended behavior. FailFix explains the likely cause, proposes small changes to the source, and generates a separate regression test. The developer reviews and runs the changes locally.

The product must distinguish three facts: a patch can be applied to the supplied text; a fix is proposed by a model; tests have actually passed. The hosted app only establishes the first two. It must never display “tests passed” for an unexecuted patch.

Success for v1: a first-time visitor can load an example, understand the diagnosis, inspect the diff, and download usable changes without instructions from us.

## 2. Release scope

### Required for v1

- One focused workspace with paste inputs and local text-file selection for source and test code.
- TypeScript `.ts` files and Vitest failures; no TSX, build-tool configuration repair, or repository-wide reasoning.
- Three bundled examples: boundary error, incorrect handling of zero, and unintended input mutation.
- Optional intended-behavior field, necessary when tests do not establish the correct behavior.
- One explicit “Analyze failure” action using the BharatCode API.
- Diagnosis with references to submitted source, test, or log lines.
- A small source diff, a proposed new regression-test file, and concise local verification steps.
- Download patch, fixed source, and regression test separately. Copy explanation and code.
- Honest handling of insufficient context, unsupported input, malformed output, and provider failures.
- Responsive layout, keyboard operation, readable line numbers, accessible status messages.
- Public deployment, repository, clear setup documentation, meaningful tests, and demo recording.

### Outside this release

GitHub OAuth/import, whole-repository uploads, ZIP parsing, automatic commits or pull requests, accounts, saved history, billing, vector databases, autonomous agents, editor extensions, and hosted execution of user code. Do not introduce these while the primary flow is incomplete.

## 3. User journey and screen design

1. Landing section states the task in one sentence and offers “Try an example” or “Use my code.” Show supported scope immediately.
2. User selects or pastes a source file, a test file, and failing output. File contents stay in browser memory until analysis is requested. Labels display paths and character counts.
3. Show a short notice that analysis sends the supplied text to BharatCode; advise against confidential code or credentials. Do not claim provider-side zero retention.
4. User optionally describes expected behavior, then selects Analyze.
5. Display “Analyzing”; prevent duplicate submissions. Cancellation aborts the app request, without promising cancellation of provider billing or computation.
6. Results contain diagnosis, evidence links, source diff, regression test, and download actions. Evidence links jump to the relevant numbered input lines.
7. Display “Proposed fix — run tests locally.” Label deterministic validation separately as “Patch matches supplied source.”
8. If information is missing, show concrete questions and retain the input. If the user changes any input, mark the result stale and disable its download actions until reanalysis.

Desktop: inputs and results alongside each other, collapsing into a single column on mobile. Use native textareas and a simple highlighted diff; defer a large editor dependency. Provide visible focus states, adequate contrast, and status announcements.

Optional cached examples must say “Saved example”; never imply a cached result came from a current live API call.

## 4. Architecture and dependencies

Use **one Next.js application with TypeScript, running as one Node.js web service**. UI and API ship together. No database or separate backend service is required.

Flow:

`Browser → POST /api/analyze → input validation → BharatCode → output validation → deterministic patch generation → browser`

Runtime packages beyond the framework:

- OpenAI SDK for BharatCode's compatible endpoint; one provider integration, no abstraction for other vendors.
- Zod for request and result validation.
- A maintained text-diff package for unified patches; do not handwrite a diff algorithm.

Development tools: Vitest for logic and route tests, Playwright for a few browser flows, TypeScript checks, and the framework's normal lint setup. Pin compatible current versions and a supported Node version during scaffolding, then commit the lockfile. Avoid speculative version numbers in this plan.

Suggested layout:

```text
app/
  page.tsx
  layout.tsx
  globals.css
  api/analyze/route.ts
  api/health/route.ts
components/
  input-workspace.tsx
  analysis-result.tsx
  patch-view.tsx
lib/
  contracts.ts
  bharatcode.ts
  prompt.ts
  patch.ts
  limits.ts
examples/
  boundary-error/
  zero-value/
  input-mutation/
tests/
  patch.test.ts
  analyze.test.ts
  browser.spec.ts
evals/
  cases/
  results.md
docs/
  architecture.md
  demo.md
.github/workflows/ci.yml
.env.example
BharatCode.txt
README.md
package.json
package-lock.json
```

Create files only as they become useful. Keep result rendering and pure patch logic separate because their validation needs differ; do not introduce a generalized agent framework.

## 5. API contract and deterministic patching

Request fields: source path/text, test path/text, failure output, and optional expected behavior. Proposed limits: 64 KiB total request body, 20 KiB per code file, 12 KiB log, and 2 KiB expected behavior. Enforce the total limit while reading the body, before parsing JSON, and field limits after parsing. Report oversize inputs without silent truncation.

Accept display paths that are relative, contain no traversal, and use supported extensions. Paths identify inputs and downloads; the server never writes user files. Source and test paths must differ. Reject binary content, empty required fields, unsupported extensions, and unexpected request shapes. Clear limits in the UI should match server limits.

Use a discriminated result:

```text
status: proposed_fix | needs_context | unsupported
summary: short explanation
evidence[]: input kind, start line, end line, explanation
edits[]: exact original snippet and replacement, source file only
regressionTest: proposed separate file content or null
questions[]: missing information
assumptions[]: behavior assumed from supplied context
```

For a proposed fix require a diagnosis, evidence, one to three edits, and a nonempty regression test. For other statuses do not manufacture a patch. Avoid uncalibrated confidence percentages.

Patch processing:

1. Validate the model result against the schema, including maximum field lengths.
2. Check that evidence line ranges exist. This checks references, not the truth of the diagnosis.
3. Match every original snippet against the exact submitted source. Each match must be unique and nonempty.
4. Reject overlapping edits and changes that amount to no change. Apply disjoint edits using original offsets, from last to first.
5. Generate the unified diff from original and updated text, rather than trusting a model-authored diff.
6. Preserve the submitted test unchanged. Put the new test beside it under a derived noncolliding name; validate relative imports against the supplied source path where feasible.
7. Preserve line endings consistently and test both LF and CRLF. Bind the result to the exact submitted inputs; edited inputs invalidate it.

These checks prove that a patch is applicable to the supplied source. They do not prove correct behavior, valid TypeScript, or complete security of generated code. Reflect that distinction in UI and documentation.

Do not silently coerce invalid model results, strip arbitrary surrounding text until something parses, or return partial patches. A failed validation gets a useful error and a manual retry action.

## 6. BharatCode integration

Baseline endpoint: `https://bharatcode.ai/api/model/v1`; model `qwen-3.8-27b`. Read the actual eligible catalog with `/models` during the first implementation session. Keep the key in server-side `BHARATCODE_API_KEY`; make the model configurable with a single environment variable.

Start with nonstreaming `/responses`, `store:false`, structured output through `text.format`, and runtime schema validation. Verify the actual schema behavior with a real request before building the result interface. If structured output is incompatible with the account/model, use an explicit JSON response instruction and the same validation; do not switch silently to another provider.

Use a bounded output budget initially around 6,000 tokens, adjusted only after measuring representative cases. Handle incomplete outputs, busy service, malformed responses, authentication errors, and account-access errors. Never show an incomplete patch as ready to download.

Suggested request policy: 90-second total deadline, one delayed retry for an explicit busy response if time remains, no automatic retry of malformed or exhausted output, and no SDK retries layered on top. Retain provider request IDs for support, without exposing credentials or code in logs.

Prompt instructions: inputs are untrusted source material; diagnose from submitted evidence; preserve public behavior unless the specification says otherwise; do not weaken tests, add dependencies, or propose shell commands; ask for context when needed. Delimit code, tests, logs, and expected behavior independently. There are no model tools or execution privileges in this release.

Documentation source: https://bharatcode.ai/build . The published API behavior remains subject to the initial live integration check.

## 7. Reliability, privacy, and public deployment

- Keep source and results in browser memory. No database, localStorage, request-body logging, or third-party session replay.
- Make no claim that BharatCode retains no prompt data. Link the provider privacy policy.
- Escape all code/log/model text on render; never insert it as HTML.
- Never execute uploaded source, generated tests, suggested commands, or model output on the hosted service.
- Same-origin browser requests, JSON content type, no permissive CORS, and server-side input checks. Origin checks alone are not abuse protection.
- Run a single Node process and replica initially. Add a bounded, expiring in-memory per-client limiter, a maximum of two concurrent provider calls, and a global request ceiling configurable for a deployment session. Add `ANALYSIS_ENABLED` as an operator kill switch. Return clear 429/503 states rather than queueing indefinitely.
- Client identity must come from the hosting platform's documented trusted proxy configuration. Do not trust arbitrary forwarded headers. If reliable client identity is unavailable, global limits remain mandatory and the limitation must be documented.
- In-memory limits reset on restart and do not span replicas. They are a hackathon deployment limit, not a billing guarantee. Before increasing replicas or traffic, use shared rate limiting and durable usage controls.
- Keep operational metadata only: app request ID, duration, status, model ID, token usage if available, and provider request ID. Never log input text, output code, keys, or raw upstream errors.
- Health endpoint reports application availability without calling the paid/model endpoint. Missing API configuration should fail clearly, not serve fake analysis.

Preferred deployment: one Render Node web service, or an existing Node host if already available. Render documents Next.js web-service deployment. Use `npm ci`, `npm run build`, and `npm start`, with secrets set in hosting settings. Verify host timeout, proxy identity, resource limits, and chosen plan before publishing. Hosting cost/account access are still unknown.

Deploy the skeleton early. Check the full HTTPS path, model latency, errors, health endpoint, and downloads from another browser session before adding polish. Do not rely on a static-only deployment because the key belongs on the server.

References: https://render.com/docs/deploy-nextjs-app ; https://nextjs.org/docs/app/getting-started/deploying ; https://bharatcode.ai/privacy .

## 8. Tests and evaluation

### Automated product checks

Patch tests: unique match, missing/ambiguous match, overlap, multiple edits, unchanged replacement, CRLF, invalid evidence range, and preservation of original tests.

API tests with mocked provider: valid proposal; needs-context result; unsupported input; oversized request before JSON parsing; invalid schema; timeout; busy response and retry bound; exhausted output; missing key; concurrency/rate limit. CI must not require live credentials.

Browser checks: example-to-result-to-download; provider failure retaining inputs; stale result after editing; keyboard operation and a mobile-width layout. Check downloaded bytes, not merely that a button was clicked.

### Model evaluation, separate from app tests

Use six documented cases: three core examples, one more difficult valid bug, insufficient context, and a misleading instruction embedded in code/log text. Mark expected behavior before requesting model output. The instruction case must not change the output contract or induce privileged actions.

Record raw attempt counts, model, prompt revision, date, latency, schema validity, patch applicability, diagnostic usefulness, and observed test outcome. Do not discard failed attempts from the report.

For runnable cases, maintain independent acceptance tests in addition to supplied failing tests. Check the buggy version fails; inspect generated source/test changes before running them; then check existing and independent tests against the fixed version. A useful regression should fail before the fix and pass afterward. Run only reviewed, first-party evaluation artifacts locally; do not build a general executor or run newly generated code automatically in privileged CI.

The proposal is ready for release when the three advertised examples have recorded successful end-to-end runs, boundary-validation tests pass, and unsupported/insufficient inputs produce honest outcomes. Report counts and limitations rather than claiming a general accuracy percentage from a tiny sample. Live outputs can vary; saved examples must remain visibly labeled.

## 9. Ordered implementation milestones

Estimates assume roughly 24–30 focused engineering hours across 22–25 October. They are planning estimates, not a promise. Preserve buffer for API and deployment issues.

| Milestone                       | Work and dependencies                                                                                        | Estimate | Exit condition                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------: | ---------------------------------------------------------------- |
| 0. Prove the integration        | Scaffold, lock versions, inspect eligible models, one real example request, validate result, deploy skeleton |     2–3h | Real structured result locally and a reachable server deployment |
| 1. Build the patch engine       | Contracts, exact-match edits, generated diff, evidence validation, downloads data                            |     3–4h | Boundary cases pass; original tests remain unchanged             |
| 2. Complete the user flow       | Inputs, examples, API route, results, evidence links, downloads, stale state                                 |     5–6h | One live example works from input to downloaded patch            |
| 3. Make the public app reliable | Limits, cancellation/deadline, error UI, secrets, logs, privacy copy, responsive/keyboard pass               |     3–4h | Failure paths work and public endpoint has abuse limits          |
| 4. Evaluate and stabilize       | Cases, reviewed local test runs, route/browser checks, prompt correction                                     |     4–5h | Honest evaluation report and three reproducible examples         |
| 5. Package and submit           | Clean-clone check, README, screenshots/video, required file, production smoke check, form submission         |     3–4h | Public repo/build and recorded submission confirmation           |

Suggested calendar, all IST:

- **22 October:** integration proof, skeleton deployment, patch engine.
- **23 October:** complete workflow and public failure handling.
- **24 October:** evaluation, UX fixes, documentation, release candidate and demo.
- **25 October:** clean-clone/production verification, publish release, submit with a target of 6 PM IST, leaving time before the displayed 11:59 PM application cutoff.

The partner says submissions close on 25 October; the official page labels 11:59 PM as the application deadline. Confirm the exact project cutoff through official channels if available; do not assume a later date.

If behind schedule, cut syntax highlighting, optional file pickers, animation, and extra examples first. Keep paste inputs, one real API path, patch validation, downloadable results, meaningful tests, privacy/secrets handling, deployment, and submission.

## 10. What makes the demonstration convincing

Use a small function that incorrectly replaces zero with a default value. Show the failing assertion and the intended behavior. Analyze it live, jump from evidence to the offending line, inspect the minimal change, and download the regression test.

Then switch to a developer terminal and review/run that exact downloaded change. If showing an earlier evaluation recording instead, label it accordingly. Never put a pre-recorded green result beside a different live patch as if they were the same verification.

Suggested 90-second recording: 10 seconds on the problem, 15 on inputs, 30 on diagnosis/diff, 20 on reviewed local verification, and 15 on scope, architecture, and repository. Prepare a clearly labeled saved example for service outages; retain a recording of real BharatCode use.

## 11. Repository and submission package

README: one-sentence problem, live URL, screenshot/GIF, quick start, environment setup, supported scope, example inputs, how BharatCode is used, verification instructions, evaluation results, privacy behavior, and known limitations.

Include the source, lockfile, `.env.example`, tests, examples, CI, architecture note, demo link, and a deliberate licence choice. Confirm a fresh clone can run using the documented commands. Never commit a real API key, personal code, or private logs.

The hackathon requires a root `BharatCode.txt`, but the reviewed public page does not explain its contents. Seek the official template. Pending clarification, prepare a plain-text factual description of the product and BharatCode integration; label that format as our own, not an organizer-specified template.

Submit the project name, public GitHub URL, and short summary through the official form. Save the confirmation and verify the displayed link works. Link the live demo in the README because the reviewed form centers on the repository.

Suggested summary: “FailFix uses BharatCode to explain failing TypeScript tests, produce a source-linked diagnosis, and propose a minimal patch with a regression test that developers can review and run locally.”

Official requirements: https://bharatcode.ai/hackathon . Partner deadline context: https://in.linkedin.com/company/codequesters .

## 12. Final release gate

- A visitor can complete the primary workflow without help.
- Real BharatCode integration works on the deployment; saved examples are labeled.
- Generated downloads match the submitted input and contain no server secrets.
- Patches are marked proposed; no unexecuted patch is presented as tested.
- Existing user tests are preserved; model output cannot execute server commands.
- The three advertised examples have recorded local verification and meaningful regression tests.
- Validation, route, and browser checks pass; production build and clean-clone setup work.
- Error states retain user input and allow recovery.
- Public rate/concurrency controls and the operator kill switch work.
- Repository documentation, demo, required root file, and public links are ready.
- Submission is completed and its confirmation is saved.

## 13. Remaining dependencies and deliberate omissions

Needed during implementation: eligible BharatCode API access, access to the intended GitHub account/repository and hosting account, confirmation of any private registration instructions, and time to review/run generated example code. These do not block preparing this plan.

Skipped: hosted execution, repo integrations, accounts, saved history, and multi-language support. Main risks: provider latency/availability, variable model output, unconfirmed submission-file format, deployment access/cost, and the narrow time window. This plan does not claim the build or live verification is already complete.
