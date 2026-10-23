# FailFix

**Understand the failure. Review the fix.**

FailFix helps developers understand failing TypeScript/Vitest tests. Supply one source file, its test, and the failure output; review an evidence-linked diagnosis, a minimal source patch, and a proposed regression test.

Built for the [BharatCode Build League](https://bharatcode.ai/hackathon), using BharatCode's model API.

## Current status

- Local application implemented, with three hand-authored example walkthroughs that work without an API key.
- Server-side BharatCode integration implemented and HTTP-mocked tests passing.
- **Live model quality remains unverified pending eligible API access.** Walkthroughs are illustrative, not cached model responses.
- Public hosting and the final hackathon submission are pending.

## Quick start

Use Node.js 22.13+ on a compatible supported release. The tested installation tool is npm 11.6.4; npm 11.5.2 encountered a dependency-resolver crash on Windows.

```sh
npx --yes npm@11.6.4 ci
npm run dev
```

Open [localhost:3000](http://localhost:3000) for the IDE-style getting-started document. Select **Open workspace**, or open `/workspace` directly. Each sample case in the explorer opens its complete saved walkthrough without a key.

For live analysis, copy `.env.example` to `.env.local` and set `BHARATCODE_API_KEY` to your developer key. Restart the development server after configuring it. API access must be enabled for your BharatCode account; creating an account or registering for the hackathon alone may not enable API access. Check [BharatCode's API documentation](https://bharatcode.ai/build).

Never commit `.env.local` or put the key in a `NEXT_PUBLIC_` variable. The app sends keys only from the server to BharatCode.

## Use your own code without an API key

The manual workflow makes no model request and needs no provider account or key inside FailFix:

1. Open `/workspace` and supply valid source, test, and failure inputs.
2. In **Use without an API key**, select **Prepare debugging prompt**. Review and copy the prompt; it contains your inputs and the response contract.
3. Paste it into a chat tool you already have access to. Only send nonconfidential code. Any external chat tool's terms and privacy policy apply.
4. Copy its JSON response into **Proposal JSON** and select **Validate proposal**. A single JSON code fence is accepted; surrounding explanations and malformed JSON are rejected.
5. FailFix checks the proposal against the supplied files and creates the same reviewable downloads as the automatic workflow. Results say **User-supplied proposal** and do not claim a model call or test execution.

Changing the source context or the pasted proposal disables old manual-result downloads until validation is repeated. The review is a structural/applicability check, not a code execution sandbox or a correctness guarantee.

This mode does not establish compliance with any hackathon model-API requirement; automatic BharatCode evaluation remains pending access.

## Use automatic diagnosis when configured

1. Paste or open one `.ts` source file and one `.test.ts` or `.spec.ts` file. Supply their relative repository paths so the new test's imports can be correct.
2. Paste the relevant Vitest failure output and, if needed, explain the intended behavior.
3. Select **Analyze failure**. Follow the evidence links, inspect the diff, and review the regression test.
4. Download `failfix.patch`. It includes the source changes and a separate new regression test. Review it in your own repository, check it with `git apply --check failfix.patch`, and apply it with `git apply failfix.patch` if appropriate. Do not overwrite a pre-existing regression-test file.
5. Run your project's normal test command. For a standard Vitest project, that is commonly `npx vitest run`.

Fixed source and regression test can also be downloaded individually. Downloading them does not apply them automatically. Editing any input marks an old result stale and disables its export actions.

## What is verified

FailFix validates model output, evidence line bounds, exact edit matches, non-overlapping changes, and a limited set of literal regression-test imports. It generates the unified diff itself.

**An applicable patch is not a verified fix.** The hosted application never executes submitted source, generated tests, or model commands. It does not prove syntax, semantics, test coverage, or the safety of generated code. Every proposed change needs human review and local tests. Existing tests are never edited.

## Supported scope and limits

- TypeScript utility code and Vitest; one source file and one existing test file.
- No repository import, TSX, dependency installation, multi-file repair, or hosted code execution.
- Maximum input sizes: 20 KiB per code file, 12 KiB failure log, 2 KiB intended behavior, and 64 KiB total JSON request body.
- Up to three source edits per proposal; incomplete, malformed, ambiguous, or overlapping proposals are rejected.
- A missing specification should produce questions, not an invented fix.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:browser
```

Browser tests use the production server, so run `npm run build` after source changes before executing them.

On Windows, browser tests can use installed Chrome instead of downloading Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:browser
```

Browser tests mock live model responses; they do not require a key. Reviewed example checks confirm the buggy fixture exposes the failure and the corresponding first-party fix satisfies independent boundary checks. See [evaluation notes](evals/results.md).

After API access is available, `npm run check:api` checks the eligible model catalog and a tiny structured-output request. It uses the local environment file without printing the key. It makes real API calls and consumes account resources; do not run it as part of CI.

## Privacy and operating limits

The app keeps code and results in browser memory. It does not save them in a database or browser storage, or log code/prompt text. Analysis sends the supplied content to BharatCode; [the provider's privacy policy](https://bharatcode.ai/privacy) applies. Use nonconfidential examples and remove credentials. Third-party fonts are loaded from Google Fonts with system fallbacks.

The demo allows at most two simultaneous analyses and defaults to 100 accepted analyses per server process. One busy-service retry can make up to two model requests per analysis. Optional per-client limits require an explicitly trusted hosting header. These in-memory limits reset on restart and are unsuitable for multiple replicas or strict billing control. See [operations](docs/operations.md).

The production dependency audit was clean at implementation time. A high-severity advisory remains in the development-only Next.js lint dependency chain (`braces` via `fast-glob`); no patched `braces` release was available in the checked registry. The lint process uses repository-controlled patterns and does not receive user inputs. Recheck `npm audit` before release; do not blindly apply a major framework downgrade from `npm audit fix --force`.

## Run a production build locally

```sh
npm run build
npm start
```

Deploy later as a Node.js web service with server-side secrets, a request timeout that accommodates the analysis deadline, and one process/replica for the current limiter. A static-only export is insufficient. Hosting has deliberately not been configured or published yet.

## Project notes

- [Architecture and trust boundaries](docs/architecture.md)
- [Implementation plan](docs/implementation-plan.md)
- [Operations and deployment checklist](docs/operations.md)
- [Demo script](docs/demo.md)
- [Evaluation status](evals/results.md)

`BharatCode.txt` is included in the repository root. Its contents are participant-authored because an organizer template has not been confirmed. Confirm the format and exact project deadline before final submission. No project license has been selected yet.

### Investigation desk

The interface uses an IDE layout: a getting-started document, sample-case explorer, editable file tabs, failure-output console, and an evidence-and-patch review pane. Collapse the explorer to focus on your input; switching files preserves edits. On smaller screens the review pane follows the editor and cases remain available above it. The console displays supplied output; it does not execute tests.
