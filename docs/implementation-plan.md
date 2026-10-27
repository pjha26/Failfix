# FailFix — implementation and release plan

Updated 27 October 2026. FailFix is an independent developer tool maintained in [pjha26/Failfix](https://github.com/pjha26/Failfix). This plan describes the implemented product and the work still needed before a public release. Hosting remains deferred at the owner's request.

## Product promise

Help developers connect a failure to its evidence, inspect a proposed change, and verify that change locally. A successful patch-validation result means the patch matches the supplied input; it does not mean tests passed or a deployment succeeded.

Two focused workflows share that principle:

- **Test desk:** one TypeScript source file, one Vitest test file, failure output, and optional expected behavior. Get an evidence-linked diagnosis, a reviewable source patch, and a proposed regression test.
- **Deployment desk:** import supported root configuration and failed Actions-step metadata from a public GitHub repository, then supply the actual build log. Get deterministic signature checks, a repair checklist, and a narrow configuration patch when the supported context warrants it.

## Implemented scope

| Area                 | Current behavior                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing page         | Original scroll-driven CSS/SVG presentation, perspective build window, chapter preview, pause control, reduced-motion and no-JavaScript fallbacks   |
| Test workspace       | Paste or select local text files, source/test/log tabs, expected behavior, evidence navigation, cancellation, and stale-result protection           |
| Automatic analysis   | Native Groq SDK with strict structured output, followed by local schema, evidence-range, and patch validation                                       |
| Manual review        | Prepare a debugging prompt, paste a structured proposal, and validate it without calling a model                                                    |
| Saved examples       | Three explicitly labeled, hand-authored walkthroughs with downloadable patches and regression tests                                                 |
| Public GitHub import | Read-only supported root configuration and failed Actions-step metadata pinned to a commit; no clone, account connection, or automatic log download |
| Build-log analysis   | Transparent signature rules; unknown failures ask for context; supported missing Next.js build scripts can produce a proposed patch                 |
| Export               | Download proposed changes for local review; changing inputs invalidates previous results                                                            |

Accounts, private repositories, whole-repository repair, automatic commits or pull requests, automatic redeployment, and hosted execution of uploaded/generated code are not implemented.

## Architecture

One Next.js application serves the React interface and Node.js API routes. There is no database or separate backend service. Inputs and results stay in session memory; automatic analysis sends the supplied input to Groq. Public repository import contacts GitHub. Keys remain on the server.

| Entry point                     | Processing path                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `POST /api/analyze`             | Bounded JSON input → request validation → admission limits → Groq → result validation → deterministic patch generation |
| `POST /api/review`              | Bounded manual proposal → request/result validation → deterministic patch generation; no provider call                 |
| `GET /api/examples/[id]`        | Labeled first-party fixture → validated saved walkthrough                                                              |
| `POST /api/github/import`       | Public URL validation → bounded read-only GitHub requests → commit-pinned configuration and run metadata               |
| `POST /api/deployments/analyze` | Supplied configuration/log validation → supported signature checks → proposed repair steps or request for context      |
| `GET /api/health`               | Application availability; no model call                                                                                |

The [architecture guide](architecture.md) contains the complete diagrams and request sequences. Runtime dependencies beyond Next.js/React are `groq-sdk`, `zod`, and `diff`; there is no animation-library dependency.

## Contracts and boundaries

- The test desk accepts one `.ts` source and one `.test.ts` or `.spec.ts` file, each up to 20 KiB; failure output is limited to 12 KiB and expected behavior to 2 KiB. The automatic input body is limited to 64 KiB.
- Display paths must be supported relative paths without traversal. The server does not write user files.
- A result is `proposed_fix`, `needs_context`, or `unsupported`. Only a valid proposed fix produces patch artifacts.
- Proposed fixes require valid evidence ranges, one to three exact nonoverlapping source edits, and a separate regression test. Original snippets must match uniquely; no-op or ambiguous edits are rejected.
- Unified patches come from validated before/after text, not a model-authored diff. Input changes disable stale exports.
- Validation does not establish valid syntax, semantic correctness, complete test coverage, or safe execution. Developers review generated code before running local checks.

See [README limitations](../README.md#limitations) and the [deployment workflow](deployments.md) for the complete supported boundaries.

## Groq integration and operational behavior

`lib/groq.ts` uses the native Groq Chat Completions SDK. `GROQ_API_KEY` is configured only in ignored local environment settings or host secrets. `GROQ_MODEL` defaults to `openai/gpt-oss-20b`. The app requests strict structured output, rejects incomplete or invalid results, and exposes no model tools or execution privileges.

The provider call has a bounded deadline and a bounded retry for a busy response. Authentication, quota, schema, malformed-result, and patch-validation failures preserve the user's inputs and do not manufacture downloadable fixes. Logs contain operational metadata rather than source text, keys, or raw upstream errors.

Current analysis admission controls assume one process and one replica. The defaults allow two concurrent analyses and 100 accepted analyses per process lifetime. Counters reset on restart; they are not a durable usage or billing cap. `ANALYSIS_ENABLED=false` pauses live analysis. Trusted client-IP configuration must follow the selected host's proxy behavior.

The [operations guide](operations.md) is the setup reference. No provider-side zero-retention claim is made; applicable service data controls still apply.

## Release work, in order

### 1. Independent product identity

Align the README, implementation plan, evaluation notes, screenshots, and public repository metadata with the current product. Remove obsolete event-specific material. Preserve required third-party licenses, honest service attribution, evaluation failures, and known limitations. Refresh screenshots from the real application.

Completion: current tracked project files and images describe FailFix consistently, links resolve, and the repository contains no obsolete provider configuration. Historical commits remain a separate record.

### 2. Complete live-model evaluation

Use all six first-party cases in [evaluation status](../evals/results.md): zero values, final-index boundaries, input mutation, multiple edits, insufficient context, and embedded instruction injection. Record every attempt, including rejections and retries, with model, commit, latency, output validity, patch applicability, explanation quality, and reviewed functional results.

Review generated code before running it in a disposable local directory. Check independent assertions against both the original and proposed code. Keep structural acceptance separate from correctness; do not infer an accuracy percentage from this small suite.

Completion: every case has recorded results and repeatability observations; unsupported cases fail clearly; known explanation or patch errors remain visible.

### 3. Prepare the public release

Choose hosting and the project's license with the owner. Configure server-side secrets, HTTPS, origins, timeout, trusted proxy behavior, and single-process limits. Recheck dependency advisories and provider usage controls before accepting public traffic. Keep no-key examples/manual review available when live analysis is unavailable.

Completion: a real hosted smoke test verifies navigation, examples, manual review, public import, build-log analysis, one reviewed live-model request, error recovery, and downloads. Until then, public hosting remains pending.

### 4. Consider account-connected repair

After the public workflow is reliable, design a least-permission GitHub App connection for private configuration and build context. The owner previously deferred this integration. Request credentials and the concrete permissions only when implementing it. Define user review, branch creation, and pull-request behavior before adding repository writes; deployment execution needs its own explicit scope and verification.

Completion: a separate reviewed implementation plan and permission model, followed by tests proving repository selection, access boundaries, and recovery behavior. No account-connected or automatic deployment capability should be advertised before it exists.

## Verification and completion record

On 27 October 2026, 99 unit/API/SDK checks and 42 production-browser checks passed, along with typecheck, lint, and production build. A real public import returned this repository's `package.json`; a real Groq request for the zero-value fixture returned the expected nullish-coalescing patch and proposed regression tests. These are application checks and a narrow live smoke test, not a general model-accuracy claim.

For code changes, run the relevant unit tests, typecheck, lint, production build, and affected desktop/mobile browser flows. For documentation-only changes, validate local links, Mermaid diagrams, screenshots, and consistency with observed behavior. Commit each completed logical change with a descriptive message and push it to the repository.

Detailed verification, including earlier failed model attempts, remains in [evaluation status](../evals/results.md). The [demo walkthrough](demo.md) explains a truthful end-to-end demonstration.
