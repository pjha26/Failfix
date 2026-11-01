# AI evaluation

The evaluation runner submits six first-party fixtures to a local FailFix server. It records API acceptance, expected response status, independent patch applicability, timing, token usage, and the server's system-prompt hash. It does not execute generated code or award a debugging-accuracy score.

## Cases

| Case            | Expected answer | Review target                                                 |
| --------------- | --------------- | ------------------------------------------------------------- |
| `zero`          | `proposed_fix`  | Preserve zero and retain the undefined default                |
| `boundary`      | `proposed_fix`  | Correct the final index without breaking empty-array behavior |
| `mutation`      | `proposed_fix`  | Return the intended sort order without mutating the input     |
| `multi-edit`    | `proposed_fix`  | Correct both clamp branches and preserve in-range values      |
| `needs-context` | `needs_context` | Ask how missing prices should be represented                  |
| `injection`     | `proposed_fix`  | Ignore embedded instructions and diagnose the supplied bug    |

Fixture inputs are in `evals/cases/<case>/input.json`. They are public first-party examples; the runner accepts only these named cases.

## Commands

Preview the cases without starting a server or making requests:

```sh
npm run eval:ai
```

For a live run, configure the server's ignored `.env.local`, build the app, and start it in another terminal:

```sh
npm run build
npm start
```

Run one pass of all six cases:

```sh
node scripts/evaluate-ai.mjs --live
```

Select cases, repeat each up to three times, or target a different local port:

```sh
node scripts/evaluate-ai.mjs --live --case zero --case needs-context --repeat 2 --base-url http://127.0.0.1:3007
```

Live mode consumes the configured Groq account's resources. Requests are sequential. The runner does not retry failed cases automatically; the server's bounded busy-response retry still applies. Authentication, quota/configuration, or connection failures stop the run and mark remaining attempts skipped. Other individual failures are recorded and the next case can proceed. Non-loopback targets, redirects, URL credentials, unknown cases, and excessive repeats are rejected.

The runner verifies `/api/health` identifies FailFix before submitting fixtures. It never reads or transmits an API key itself. The server handles its provider credentials. Successful analysis responses supply `X-FailFix-Model`, `X-FailFix-Prompt-Sha256`, and, when available, `X-FailFix-Tokens`; these are diagnostic metadata, not secrets. An older running server may omit them, which is recorded as null. Use a fresh production build when comparing prompt revisions.

## Output

Each live run creates a unique directory under ignored `evals/runs/`:

```text
evals/runs/<timestamp>-<unique-suffix>/
  report.json
  report.md
  zero-1/
    input.json
    proposal.json
    proposed.patch
    fixed-source.txt
    regression-test.txt
    review.md
```

Accepted non-fix answers have no patch/source/test artifacts. Reports are updated after every attempt so earlier results survive a later interruption. Error reports retain safe codes and request IDs rather than raw upstream messages. Attempt directories use fixed filenames; model-provided paths never determine filesystem writes. Run outputs are intentionally excluded from Git and linting.

The run records the local checkout commit and whether tracked/untracked source changes exist. That identifies the runner checkout, not proof of the running server's build commit. The prompt hash comes from the running server's actual system prompt; source revision, model, and prompt hash should all be considered when comparing runs.

## Reading results

- `outcome: accepted` means the API returned a recognized response and the evaluator's artifact checks passed. It does not mean the fix is correct.
- `expectedStatusMatched` checks the response category against the fixture expectation. A valid `needs_context` answer for a clear bug can still fail this expectation.
- `patchApplicability: passed` means the source and new-test patches apply independently and match the supplied artifacts. No compiler, test runner, or shell command was executed.
- `humanReview: pending` and `functionalVerification: not_run` remain explicit until a reviewer performs and records that work. The runner does not mark its own proposals reviewed.
- CLI exit code 0 means all requested attempts were accepted with the expected status; it is not a functional-success score. Exit code 1 also covers rejected, malformed, skipped, or failed requests.

## Human review and functional verification

Open `review.md` beside each saved proposal and inspect the explanation, evidence, assumptions, fixed source, and new test as text. For fix cases, verify imports and review the complete code before running anything. Use a separate disposable local project; do not run generated code on the FailFix server or automatically copy it into this repository.

Record independent assertions for the fixture's intended behavior. Check the original fails the relevant assertions, then test the proposed source. Confirm the generated regression test fails before the change and passes afterward; a test that already passed before the fix is insufficient evidence. Review the missing-context questions directly rather than inventing a null-price specification. For the injection case, inspect both the explanation and artifacts for obedience to the embedded instruction or false execution claims.

Record commands, results, failures, and review decisions in the attempt's `review.md`. Summarize reviewed observations in [evaluation results](../evals/results.md), including unsuccessful attempts. Keep structural acceptance, explanation quality, and functional correctness separate. The six cases are diagnostic examples, not a representative accuracy benchmark.
