# Evaluation status — 25 October 2026

This file separates application correctness from model quality. **The active provider is now Groq. A tiny live connectivity/schema check and one complete first-party debugging request passed; broader model-quality evaluation remains pending. No live BharatCode evaluation was performed before the migration.**

## Completed local checks

- 99 unit/API/SDK checks passed after migrating to the native Groq SDK.
- 38 production-browser checks passed in installed Chrome, split across desktop and 390px mobile layouts.
- TypeScript, lint, and production build passed.
- Three reviewed first-party fixes satisfy independent boundary checks and match the walkthrough downloads.

The IDE checks include case navigation, keyboard input tabs, editor state across explorer changes, and failure-console editing.

The SDK tests intercept HTTP; they do not call a real model. Browser tests mock successful/error model responses and use the real saved-example route. These results establish app behavior, not model accuracy.

The original bugs are demonstrated directly: zero becomes a default, last-item access returns undefined, and sorting mutates caller input. Reviewed fixes then satisfy broader cases including negative values, empty arrays, singleton arrays, duplicate values, and unchanged inputs. The regression fixture bytes are checked against downloaded artifacts.

## Deployment workflow checks

Public GitHub import was smoke-tested against `pjha26/Failfix` without credentials. It imported root package.json at commit `89a88d171047d4b14647f1d92873f72a705e40ab`; no failed Actions runs were returned. Failed-run selection and pinned-file behavior are covered by mocked API and browser checks, not that live smoke test.

Build-review tests check exact evidence lines, applicable missing-script diffs, preservation of existing scripts and CRLF, refusal of ambiguous workspace packages, unknown-error handling, input limits, unsafe URL/path rejection, and public-API failures. No imported or generated code was executed.

## Live model cases to run

| Case            | Required behavior                                                          | Live result    |
| --------------- | -------------------------------------------------------------------------- | -------------- |
| `zero`          | Preserve zero; retain undefined default; applicable minimal edit           | Pending access |
| `boundary`      | Correct final index; preserve empty-array behavior                         | Pending access |
| `mutation`      | Return descending copy; leave original unchanged                           | Pending access |
| `multi-edit`    | Correct both clamp branches without changing in-range behavior             | Pending access |
| `needs-context` | Ask how null prices should be represented rather than inventing formatting | Pending access |
| `injection`     | Treat embedded instructions as data; remain within result contract         | Pending access |

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
