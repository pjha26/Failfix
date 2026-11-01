import { parseArgs } from 'node:util';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { applyPatch, parsePatch } from 'diff';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CASES = [
  'zero',
  'boundary',
  'mutation',
  'multi-edit',
  'needs-context',
  'injection',
];
const STATUSES = ['proposed_fix', 'needs_context', 'unsupported'];

export function optionsFrom(args) {
  const { values } = parseArgs({
    args,
    options: {
      live: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      'base-url': { type: 'string', default: 'http://127.0.0.1:3000' },
      case: { type: 'string', multiple: true },
      repeat: { type: 'string', default: '1' },
    },
  });
  const url = new URL(values['base-url']);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Use a loopback base URL without credentials, paths, queries, or fragments.',
    );
  const repeat = Number(values.repeat);
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 3)
    throw new Error('Repeat must be an integer from 1 to 3.');
  const cases = [...new Set(values.case || CASES)];
  if (cases.some((id) => !CASES.includes(id)))
    throw new Error('Unknown case. Choose: ' + CASES.join(', '));
  return {
    live: values.live,
    help: values.help,
    baseUrl: url.origin,
    cases,
    repeat,
  };
}

export async function loadCases(ids) {
  return Promise.all(
    ids.map(async (id) => {
      if (!CASES.includes(id)) throw new Error('Unknown evaluation case.');
      const input = JSON.parse(
        await readFile(join(ROOT, 'evals', 'cases', id, 'input.json'), 'utf8'),
      );
      if (
        !input.source?.text ||
        !input.source?.path ||
        !input.test?.text ||
        !input.test?.path ||
        !input.log ||
        typeof input.expectedBehavior !== 'string'
      )
        throw new Error('Invalid fixture: ' + id);
      return {
        id,
        input,
        expectedStatus:
          id === 'needs-context' ? 'needs_context' : 'proposed_fix',
      };
    }),
  );
}

async function boundedJson(response) {
  if (!response.body) throw new Error('INVALID_RESPONSE');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256 * 1024) {
        await reader.cancel();
        throw new Error('INVALID_RESPONSE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('INVALID_RESPONSE');
  }
}

export function inspectResponse(input, data) {
  const analysis = data?.analysis;
  if (
    !STATUSES.includes(analysis?.status) ||
    typeof analysis.summary !== 'string' ||
    !Array.isArray(analysis.edits)
  )
    throw new Error('INVALID_RESPONSE');
  if (analysis.status !== 'proposed_fix') {
    if (
      data.artifacts !== null ||
      analysis.edits.length ||
      analysis.regressionTest !== null ||
      (analysis.status === 'needs_context' &&
        (!Array.isArray(analysis.questions) || !analysis.questions.length))
    )
      throw new Error('INVALID_RESPONSE');
    return 'not_applicable';
  }
  const a = data.artifacts;
  const regressionPath = input.test.path.replace(
    /\.(test|spec)\.ts$/,
    '.failfix.test.ts',
  );
  if (
    !a ||
    !['fixedSource', 'patch', 'regressionPath', 'regressionTest'].every(
      (key) => typeof a[key] === 'string',
    ) ||
    a.regressionPath !== regressionPath ||
    regressionPath === input.source.path ||
    a.fixedSource === input.source.text ||
    a.regressionTest !== analysis.regressionTest
  )
    throw new Error('INVALID_RESPONSE');
  const patches = parsePatch(a.patch);
  if (
    patches.length !== 2 ||
    patches[0].oldFileName !== 'a/' + input.source.path ||
    patches[0].newFileName !== 'b/' + input.source.path ||
    patches[1].oldFileName !== '/dev/null' ||
    patches[1].newFileName !== 'b/' + regressionPath ||
    applyPatch(input.source.text, patches[0]) !== a.fixedSource ||
    applyPatch('', patches[1]) !== a.regressionTest
  )
    throw new Error('INVALID_RESPONSE');
  return 'passed';
}

function sourceRevision() {
  try {
    return {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: ROOT,
        encoding: 'utf8',
      }).trim(),
      dirty: !!execFileSync('git', ['status', '--porcelain'], {
        cwd: ROOT,
        encoding: 'utf8',
      }).trim(),
    };
  } catch {
    return { commit: null, dirty: null };
  }
}

export async function runEvaluation(
  options,
  outputRoot = join(ROOT, 'evals', 'runs'),
  onAttempt = () => {},
) {
  const cases = await loadCases(options.cases);
  if (!options.live)
    return {
      mode: 'preview',
      cases: cases.map((c) => ({ id: c.id, expectedStatus: c.expectedStatus })),
      repeat: options.repeat,
    };
  const health = await fetch(options.baseUrl + '/api/health', {
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!health.ok || (await boundedJson(health)).service !== 'failfix')
    throw new Error(
      'Start the FailFix server at the configured loopback URL before evaluating.',
    );
  await mkdir(outputRoot, { recursive: true });
  const directory = await mkdtemp(
    join(outputRoot, new Date().toISOString().replace(/[:.]/g, '-') + '-'),
  );
  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    source: sourceRevision(),
    repeat: options.repeat,
    attempts: [],
  };
  let stopped = false;
  for (const fixture of cases) {
    for (let attempt = 1; attempt <= options.repeat; attempt++) {
      const record = {
        case: fixture.id,
        attempt,
        expectedStatus: fixture.expectedStatus,
        outcome: stopped ? 'skipped' : 'error',
        humanReview: 'pending',
        functionalVerification: 'not_run',
      };
      if (!stopped) {
        const started = Date.now();
        let response;
        try {
          response = await fetch(options.baseUrl + '/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: options.baseUrl,
            },
            body: JSON.stringify(fixture.input),
            redirect: 'error',
            signal: AbortSignal.timeout(105_000),
          });
          record.httpStatus = response.status;
          const data = await boundedJson(response);
          if (!response.ok) {
            record.outcome = 'rejected';
            record.errorCode =
              typeof data.code === 'string' && /^[A-Z_]{1,64}$/.test(data.code)
                ? data.code
                : 'HTTP_' + response.status;
            record.requestId =
              typeof data.requestId === 'string' ? data.requestId : null;
            stopped = [401, 403, 429, 503].includes(response.status);
          } else {
            record.patchApplicability = inspectResponse(fixture.input, data);
            record.outcome = 'accepted';
            record.actualStatus = data.analysis.status;
            record.expectedStatusMatched =
              data.analysis.status === fixture.expectedStatus;
            record.requestId = data.requestId;
            record.model = response.headers.get('x-failfix-model');
            record.promptHash = response.headers.get('x-failfix-prompt-sha256');
            const tokens = response.headers.get('x-failfix-tokens');
            record.tokens =
              tokens && /^\d+$/.test(tokens) ? Number(tokens) : null;
            record.serverDurationMs = data.durationMs ?? null;
            const attemptDirectory = join(
              directory,
              fixture.id + '-' + attempt,
            );
            await mkdir(attemptDirectory);
            await writeFile(
              join(attemptDirectory, 'input.json'),
              JSON.stringify(fixture.input, null, 2) + '\n',
            );
            await writeFile(
              join(attemptDirectory, 'proposal.json'),
              JSON.stringify(data, null, 2) + '\n',
            );
            await writeFile(
              join(attemptDirectory, 'review.md'),
              '# Human review\n\nStatus: pending\n\n- [ ] Explanation and assumptions checked against the fixture\n- [ ] Evidence supports the explanation, not just valid line numbers\n- [ ] Generated source and test reviewed before any execution\n- [ ] Independent checks recorded where a fix is expected\n- [ ] Regression fails before the fix and passes after it\n\nFor missing-context answers, assess whether the questions address the ambiguity. Record commands, observations, and failures here. Never infer functional correctness from API acceptance alone.\n',
            );
            if (data.artifacts) {
              await writeFile(
                join(attemptDirectory, 'proposed.patch'),
                data.artifacts.patch,
              );
              await writeFile(
                join(attemptDirectory, 'fixed-source.txt'),
                data.artifacts.fixedSource,
              );
              await writeFile(
                join(attemptDirectory, 'regression-test.txt'),
                data.artifacts.regressionTest,
              );
            }
          }
        } catch (error) {
          record.outcome = 'error';
          record.errorCode =
            error.message === 'INVALID_RESPONSE'
              ? 'INVALID_RESPONSE'
              : 'REQUEST_OR_RECORDING_FAILED';
          stopped = !response || [401, 403, 429, 503].includes(response.status);
        }
        record.elapsedMs = Date.now() - started;
      } else record.errorCode = 'RUN_STOPPED';
      report.attempts.push(record);
      await writeFile(
        join(directory, 'report.json'),
        JSON.stringify(report, null, 2) + '\n',
      );
      const rows = report.attempts.map(
        (r) =>
          '| ' +
          [
            r.case,
            r.attempt,
            r.outcome,
            r.actualStatus || r.errorCode,
            r.expectedStatusMatched ?? '—',
            r.patchApplicability || '—',
            r.elapsedMs ?? '—',
          ].join(' | ') +
          ' |',
      );
      await writeFile(
        join(directory, 'report.md'),
        '# AI evaluation run\n\nAccepted responses and applicable patches are not functional correctness scores. Human review is pending; generated code has not been executed.\n\n| Case | Attempt | Outcome | Status/code | Expected status | Patch applicability | Client ms |\n| --- | --- | --- | --- | --- | --- | --- |\n' +
          rows.join('\n') +
          '\n',
      );
      onAttempt(record);
    }
  }
  return { directory, ...report };
}

async function main() {
  const options = optionsFrom(process.argv.slice(2));
  if (options.help) {
    console.log(
      'npm run eval:ai -- [--live] [--base-url http://127.0.0.1:3000] [--case zero] [--repeat 1]\nDefault: preview only. Live mode consumes Groq resources. Generated code is never executed.',
    );
    return;
  }
  const report = await runEvaluation(options, undefined, (record) =>
    console.log(
      `${record.case} #${record.attempt}: ${record.outcome} / ${record.actualStatus || record.errorCode}`,
    ),
  );
  if (report.mode === 'preview')
    console.log(
      JSON.stringify(report, null, 2) +
        '\nNo requests sent. Add --live to run against a local FailFix server.',
    );
  else {
    console.log(
      'Reports: ' +
        report.directory +
        '\nHuman review and local functional checks remain required.',
    );
    process.exitCode = report.attempts.every(
      (r) => r.outcome === 'accepted' && r.expectedStatusMatched,
    )
      ? 0
      : 1;
  }
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  main().catch(() => {
    console.error(
      'Evaluation could not complete. Check the server URL, command options, fixtures, and output-directory access. No secrets are printed.',
    );
    process.exitCode = 1;
  });
