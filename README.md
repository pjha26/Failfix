# FailFix

Understand the failure. Review the fix.

FailFix turns failing TypeScript/Vitest tests into an evidence-linked diagnosis, an applicable source patch, and a proposed regression test using BharatCode. Implementation is in progress; this foundation does not yet perform analysis.

## Development

Use Node.js 22.13 or newer compatible LTS.

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` and configure your BharatCode key when API access is available. Keys stay on the server; never commit `.env.local`.

## Scope

One source file, one test file, and failing output. Generated fixes require human review and local verification. The hosted app will not execute submitted code.

See [the implementation plan](docs/implementation-plan.md) for milestones and release gates.
