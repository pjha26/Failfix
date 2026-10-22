# Evaluation status — 22 October 2026

This file separates application correctness from model quality. **No live BharatCode evaluation has been performed yet; eligible API access is pending.**

## Completed local checks

- 55 unit/API/SDK checks passed after the landing and manual-review milestone.
- 24 production-browser checks passed in installed Chrome, split across desktop and 390px mobile layouts.
- TypeScript, lint, and production build passed.
- Three reviewed first-party fixes satisfy independent boundary checks and match the walkthrough downloads.

The SDK tests intercept HTTP; they do not call a real model. Browser tests mock successful/error model responses and use the real saved-example route. These results establish app behavior, not model accuracy.

The original bugs are demonstrated directly: zero becomes a default, last-item access returns undefined, and sorting mutates caller input. Reviewed fixes then satisfy broader cases including negative values, empty arrays, singleton arrays, duplicate values, and unchanged inputs. The regression fixture bytes are checked against downloaded artifacts.

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
