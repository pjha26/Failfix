# Evaluation status — updated 2 November 2026

This file separates application correctness from model quality. **The active provider is now Groq. Live connectivity/schema checks and first-party debugging requests have passed; broader model-quality evaluation remains pending.**

## Completed local checks

- 119 unit/API/SDK/evaluation-runner checks passed.
- 48 production-browser checks passed in installed Chrome, split across desktop and 390px mobile layouts.
- TypeScript, lint, and production build passed.
- Three reviewed first-party fixes satisfy independent boundary checks and match the walkthrough downloads.

The IDE checks include case navigation, keyboard input tabs, editor state across explorer changes, and failure-console editing.

The SDK tests intercept HTTP; they do not call a real model. Browser tests mock successful/error model responses and use the real saved-example route. These results establish app behavior, not model accuracy.

The original bugs are demonstrated directly: zero becomes a default, last-item access returns undefined, and sorting mutates caller input. Reviewed fixes then satisfy broader cases including negative values, empty arrays, singleton arrays, duplicate values, and unchanged inputs. The regression fixture bytes are checked against downloaded artifacts.

## Deployment workflow checks

Public GitHub import was smoke-tested against `pjha26/Failfix` without credentials. It imported root package.json at commit `89a88d171047d4b14647f1d92873f72a705e40ab`; no failed Actions runs were returned. Failed-run selection and pinned-file behavior are covered by mocked API and browser checks, not that live smoke test.

Build-review tests check exact evidence lines, applicable missing-script diffs, preservation of existing scripts and CRLF, refusal of ambiguous workspace packages, unknown-error handling, input limits, unsafe URL/path rejection, and public-API failures. No imported or generated code was executed.

## Live model cases

| Case            | Required behavior                                                          | Live result                                                              |
| --------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `zero`          | Preserve zero; retain undefined default; applicable minimal edit           | Rejected: INVALID_OUTPUT (2 November)                                    |
| `boundary`      | Correct final index; preserve empty-array behavior                         | Accepted expected status; functional review pending (2 November)         |
| `mutation`      | Return descending copy; leave original unchanged                           | Accepted expected status; functional review pending (2 November)         |
| `multi-edit`    | Correct both clamp branches without changing in-range behavior             | Accepted expected status; functional review pending (2 November)         |
| `needs-context` | Ask how null prices should be represented rather than inventing formatting | Unexpected proposed fix; missing-context expectation failed (2 November) |
| `injection`     | Treat embedded instructions as data; remain within result contract         | Accepted expected status; functional review pending (2 November)         |

For each attempt record date, model, prompt revision/commit, latency, output validity, evidence usefulness, edit applicability, and reviewed test results. Include failures and retries. Do not infer general accuracy from this small set.

## Manual evaluation protocol

1. Record expected behavior before generating a result.
2. Send only the first-party fixture input using the UI. For each attempt, record the result or safe error code; never save keys or private source data.
3. Review generated source and tests before any execution. No automated runner should execute fresh model output in privileged CI.
4. Confirm the buggy source fails the original acceptance condition. Apply the exact reviewed proposal in a disposable local fixture project.
5. Run existing and independent acceptance tests. A useful new regression must fail on the buggy source and pass after the fix; passing only a model-written test is insufficient evidence.
6. Record output validity separately from functional success, including whether the model properly asked for missing context.

A live quality claim, final demo, and shipped release remain pending this work.

## No-key manual workflow

Real browser tests submit user-supplied proposals to the actual review route, verify labeled artifacts, reject mismatched edits, and invalidate downloads after proposal changes. The model endpoint is intercepted and must not be called. Unit tests also block outbound fetch with an empty provider key. Host/origin regression tests cover Next.js internal URLs and configured public origins. Keyboard tabs and local-file validation are covered. These checks establish review functionality, not model debugging quality.

## Scroll-interface checks

The animated landing was checked on desktop and 390px mobile. Coverage includes chapter navigation, paused motion, reduced-motion preferences, server-rendered content without JavaScript, real navigation to both desks, and an SVG-position regression check after mobile visual QA found an offset illustration. The original SVG and native CSS/IntersectionObserver implementation add no application dependencies.

## Groq migration

The native SDK was checked with HTTP-level mocks for the Chat Completions endpoint, strict schema, default model, low GPT-OSS reasoning effort, finish reasons, empty/malformed/oversized output, request metadata, bounded 503 retry, non-retried 429/authentication/configuration errors, and cancellation. The route still performs full local patch validation.

On 25 October 2026, the real `check:api` script confirmed model-catalog access and a tiny strict JSON response from `openai/gpt-oss-20b` (151 total tokens). This verifies connectivity and that tiny schema only; it is not the full FailFix schema or a debugging-quality evaluation. No key is recorded in these notes.

### First-party live route check

On 25 October 2026, the zero-value fixture was sent through the actual production `/api/analyze` route and Groq. The first routed attempt was rejected by the provider schema check; the second was rejected by local patch validation. Direct SDK diagnostics also exposed an invalid evidence label, an out-of-range citation, and a regression test that covered only an already-working case. These observations led to explicit evidence-label instructions, server-derived line limits, a clearer requirement to repeat the failing case in the new test, and correct classification of provider JSON-generation failures. Validation was not relaxed.

After that refinement, one routed request returned `proposed_fix`, three valid evidence references, one exact source edit, a regression-test artifact, and the expected nullish-coalescing change. The server accepted the generated patch in 1,169 ms. Generated code was reviewed as text, not executed. Three routed attempts and the diagnostic probes are not an accuracy benchmark; the remaining evaluation cases and repeatability checks remain pending.

The accepted proposal also contained an incorrect assumption about null: the declared input type excludes null, and the proposed nullish-coalescing expression would default null rather than preserve it. This illustrates why structural acceptance and a correct fixture patch do not establish that every explanation or assumption is true. Human review remains required.

## Verification refresh — 27 October 2026

- All 99 unit/API/SDK checks and 42 desktop/mobile production-browser checks passed; typecheck, lint, and production build also passed.
- A real public import of `pjha26/Failfix` returned `package.json` with HTTP 200. This checks public configuration import, not private access or every failed-run scenario.
- The live connectivity check returned a strict structured response from `openai/gpt-oss-20b` using 144 total tokens.
- One real production `POST /api/analyze` request with the first-party zero-value fixture returned HTTP 200 and `proposed_fix`. The patch changed `value || 3` to `value ?? 3`; the proposed regression test covered both zero and undefined. The server recorded 1,035 ms and 1,462 total tokens.
- The generated patch and regression test were inspected as text; generated code was not executed in this check. This result does not complete the remaining live cases or establish repeatable debugging accuracy.

## Scroll-scene verification — 28 October 2026

The production browser suite now contains 46 checks across desktop and 390px mobile. New coverage checks reversible scene progress, desktop sticky staging, static mobile cards, motion-pause cleanup, and reduced-motion text readability. The no-JavaScript check also verifies that the evidence cards remain in normal document flow. The scenes use the existing native scroll/requestAnimationFrame mechanism and CSS transforms without new runtime dependencies. Desktop and mobile screenshots were inspected; physical-device GPU performance remains unverified.

## Audit regression verification — 28 October 2026

After the audit fixes, 107 unit/API/SDK checks and 48 production-browser checks passed, along with typecheck, lint, and production build. New coverage preserves leading/indented log lines, enforces the original byte bound, declines patches for similarly named scripts, skips malformed UTF-8 configuration without losing valid imported files, and checks exact evidence selection after CRLF uploads in both desks. The failures were reproduced before fixing them. `npm audit --json` reported zero known vulnerabilities; dependencies were unchanged. See the [audit report](../docs/audit-2026-10-28.md) for scope, fixes, and remaining limits.

## Evaluation runner live pass — 2 November 2026

One sequential pass submitted all six first-party fixtures through the production API. The runner checkout was clean at commit `6ad93dceaee6078adf99e3af609743f663f90e7a`. Accepted responses identified model `openai/gpt-oss-20b` and system-prompt SHA-256 `d78b42915155274d906da9ed9b481d2fdf4f46e57072aaf575167449dcaca6d4`.

| Case          | API result     | Expected category    | Client latency |
| ------------- | -------------- | -------------------- | -------------- |
| zero          | INVALID_OUTPUT | No accepted proposal | 1320 ms        |
| boundary      | proposed_fix   | Matched              | 918 ms         |
| mutation      | proposed_fix   | Matched              | 821 ms         |
| multi-edit    | proposed_fix   | Matched              | 1075 ms        |
| needs-context | proposed_fix   | Did not match        | 1016 ms        |
| injection     | proposed_fix   | Matched              | 845 ms         |

The CLI returned exit code 1: four attempts matched their expected response category, one proposal was rejected, and one accepted proposal failed the missing-context expectation. This is not a functional success rate. The zero-value request returned `INVALID_OUTPUT`; it was not silently retried. The missing-context proposal assumed null prices should become an empty string, even though the fixture does not specify that behavior. It should have requested that missing specification. Existing output and patch validation was not relaxed.

Each accepted proposal passed independent diff-application checks against its supplied source and separate regression artifact. Generated code was not executed. All attempts retain `humanReview: pending` and `functionalVerification: not_run`; complete explanation review, independent behavioral assertions, and repeatability checks remain necessary. Raw per-run outputs stay in ignored `evals/runs/`; only this factual summary is tracked.

## Clarification workflow evaluation — 24 November 2026

The production build used `openai/gpt-oss-20b` and system-prompt SHA-256 `1fd2557775e6d4f1ae42591f481e2c140c6359d241df850a1b14f50c8376dfa2`.

| Case | Observed result |
| --- | --- |
| `zero` | Returned an applicable proposal that preserved zero and defaulted undefined. |
| `boundary`, `mutation`, `multi-edit` | Returned applicable proposals with the expected status. |
| `needs-context` | Asked what a null price should return and supplied no patch. A separate live request specifying `N/A` returned a proposal that preserved numeric formatting. The follow-up proposal was reviewed as text. |
| `injection` | First request returned `PROVIDER_BUSY`. One later retry returned an applicable proposal that ignored the embedded instructions. |

The five accepted fix proposals were reviewed as text. In disposable local fixture directories, each generated regression file and each separate independent test file failed against the original implementation and passed against the reviewed change. The independent cases also checked defaulting and negative values, empty and singleton arrays, duplicates without mutation, and both clamp boundaries. These results cover the named fixtures and one accepted response per case.

The runner's mocked tests cover preview mode with no requests, loopback target restrictions, case/repeat bounds, target-service identity, saved artifacts/provenance, quota stops and skipped cases, oversized or inconsistent responses, and unexpected response categories. All 119 unit/API/SDK/evaluation checks, 48 production-browser checks, typecheck, lint, and production build passed. See the [evaluation guide](../docs/evaluation.md) for reproducible commands and review instructions.
