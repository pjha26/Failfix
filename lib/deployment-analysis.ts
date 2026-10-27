import { createTwoFilesPatch } from 'diff';
import {
  deploymentInputSchema,
  type DeploymentReport,
  type DeploymentFinding,
} from './deployment-contracts';

export function inspectDeployment(untrusted: unknown): DeploymentReport {
  const input = deploymentInputSchema.parse(untrusted);
  const lines = input.log.split(/\r?\n/);
  const findings: DeploymentFinding[] = [];
  const add = (
    id: string,
    pattern: RegExp,
    title: string,
    explanation: string,
    steps: string[],
  ) => {
    const evidence = lines
      .flatMap((text, i) =>
        pattern.test(text) ? [{ line: i + 1, text: text.slice(0, 500) }] : [],
      )
      .slice(0, 3);
    if (evidence.length)
      findings.push({ id, title, explanation, evidence, steps });
  };
  add(
    'missing-build',
    /Missing script:\s*(?:"build"|'build'|build(?=\s|$))/i,
    'The requested build script is missing',
    'The package manager could not find a build script in the package selected by the deployment command. Check the working directory as well as package.json.',
    [
      'Confirm the deployment root points to the intended package, especially in a monorepo.',
      'If this is the root Next.js app, review a build script that runs next build.',
      'Commit the reviewed configuration and run the same build command locally.',
    ],
  );
  add(
    'lockfile',
    /npm ci can only install|package\.json and package-lock\.json.*(?:sync|match)|frozen.lockfile|ERR_PNPM_OUTDATED_LOCKFILE|EUSAGE/i,
    'The install step may be blocked by the lockfile',
    'These install errors commonly indicate a missing or out-of-date lockfile, or a package-manager mismatch. The log signature is a clue, not a complete diagnosis.',
    [
      'Use the package manager and version declared by the project.',
      'Regenerate the correct lockfile locally after reviewing dependency changes, then commit it with package.json.',
      'Re-run the frozen install command. Do not bypass it just to hide a mismatch.',
    ],
  );
  add(
    'node-version',
    /unsupported engine|EBADENGINE|Node\.js version.*(?:required|detected|not supported)|requires Node\.js|You are using Node\.js/i,
    'The build runtime may not meet the project requirements',
    'The error references a Node.js compatibility requirement. A package.json engine declaration alone does not change the runtime on a hosting service.',
    [
      'Read the exact required version in the log and package.json engines field.',
      'Set a compatible supported Node version in the CI setup or hosting runtime settings.',
      'Use the same runtime locally and in the build service, then repeat the install and build.',
    ],
  );
  add(
    'environment',
    /Environment variable not found|Missing (?:required )?(?:environment variable|env(?:ironment)? var)|(?:DATABASE_URL|API_KEY).*is (?:missing|not defined|required)/i,
    'A required environment setting is unavailable',
    'The build reports a missing environment variable. Values belong in the host or CI secret settings, not in a downloaded source patch.',
    [
      'Check the variable name and whether the failing run is a preview, production, or fork build.',
      'Configure the value in the appropriate host or GitHub secret scope without committing it.',
      'Rebuild after updating settings. Never paste secret values into this tool or an issue.',
    ],
  );
  add(
    'module-resolution',
    /Module not found|Cannot find module|Can't resolve|Could not resolve/i,
    'The build cannot resolve a module or file',
    'This may be a missing dependency, a wrong relative import, filename casing, or a dev dependency omitted during the build. The signature alone cannot determine which.',
    [
      'Compare the import path and filename casing; Linux builds are case-sensitive.',
      'Check that the dependency is declared in the package being built and included in its lockfile.',
      'Confirm build-time dependencies are installed before running the build.',
    ],
  );
  add(
    'typecheck',
    /Type error:|error TS\d{4}|TS\d{4}:/i,
    'A TypeScript check is blocking the build',
    'The build reached a type error. Disabling type checking would hide the failure rather than establish a correct change.',
    [
      'Inspect the referenced source and its types; this config-only review cannot repair arbitrary application code.',
      'Use the test-debugging workspace if you can isolate the issue to one source and test.',
      'Run the project typecheck and production build after the source correction.',
    ],
  );
  add(
    'memory',
    /JavaScript heap out of memory|Reached heap limit|exit code 137|OOMKilled/i,
    'The process may have exceeded its memory allowance',
    'The log contains a memory-pressure signature. Confirm the platform termination reason before changing resource settings.',
    [
      'Check the host memory limit and the failing build stage.',
      'Reduce unnecessary build work or choose appropriate resources for the project.',
      'Measure a repeat build before increasing limits; no automatic resource change is made here.',
    ],
  );

  let patch: DeploymentReport['patch'] = null;
  const packageFile = input.files.find((file) => file.path === 'package.json');
  if (
    packageFile &&
    findings.some((finding) => finding.id === 'missing-build')
  ) {
    try {
      const data = JSON.parse(packageFile.text);
      const scripts = data.scripts;
      const hasNext =
        typeof data.dependencies?.next === 'string' ||
        typeof data.devDependencies?.next === 'string';
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        hasNext &&
        (scripts === undefined ||
          (scripts &&
            typeof scripts === 'object' &&
            !Array.isArray(scripts))) &&
        !Object.hasOwn(scripts || {}, 'build') &&
        data.workspaces === undefined
      ) {
        data.scripts = { ...scripts, build: 'next build' };
        const eol = packageFile.text.includes('\r\n') ? '\r\n' : '\n';
        const indent = packageFile.text.match(/\n([\t ]+)"/)?.[1] || '  ';
        const after =
          JSON.stringify(data, null, indent).replace(/\n/g, eol) + eol;
        patch = {
          path: packageFile.path,
          before: packageFile.text,
          after,
          diff: createTwoFilesPatch(
            'a/package.json',
            'b/package.json',
            packageFile.text,
            after,
            '',
            '',
            { context: 3 },
          ),
        };
      }
    } catch {
      /* An invalid package file remains review context, never an automatic edit. */
    }
  }
  return {
    status: findings.length ? 'findings' : 'needs_context',
    findings,
    patch,
    verification: [
      'Review these signature-based findings against the complete failing run; they are not AI diagnoses.',
      'If a patch is offered, verify it against the same repository commit and intended working directory before applying it.',
      'Repeat the original install and build locally, then trigger the appropriate deployment yourself. No code or deployment ran here.',
    ],
  };
}
