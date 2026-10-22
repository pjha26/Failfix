# Demo script

Target: 90 seconds. Record a live model example only after eligible API access has been confirmed. Until then, explicitly introduce the saved example as a hand-authored walkthrough.

1. **0–10s:** “FailFix helps developers understand a failing test and review a focused fix.” Show the TypeScript/Vitest scope.
2. **10–25s:** Load “Zero is a value.” Show the source, existing test, failing output, and intended behavior. Explain that zero disables retries.
3. **25–45s:** Analyze live, or explicitly open the saved walkthrough. Follow source/test evidence. Explain why logical OR replaces zero.
4. **45–60s:** Inspect the minimal source diff and regression test. Show “Tests have not been run here” and download the patch.
5. **60–80s:** Review that exact downloaded patch in a first-party fixture project. Show the relevant test failing before the change, then run the original and regression tests after applying the reviewed patch. Do not present results from a different patch as verification of the current one.
6. **80–90s:** Show repository setup/tests, mention server-side BharatCode integration and the intentional absence of hosted code execution.

If the model is unavailable, show a recorded real run with its date or a clearly labeled saved walkthrough. Do not conceal the fallback.

The current repository has no completed demo video. Record and add the link after live integration/evaluation, or explicitly state the demonstration uses illustrative results.

## No-key demonstration

Prepare a debugging prompt from first-party inputs, paste a clearly attributed proposal, validate it, inspect the evidence and diff, and download the patch. If the proposal is hand-authored, say so. Show a mismatched source edit being rejected. This demonstrates the real review engine without claiming a model call or execution of generated code.
