import { z } from 'zod';
import { AnalysisError } from './http';
import { byteLength } from './contracts';
import {
  isDeploymentFile,
  type GithubRun,
  type GithubSnapshot,
  type DeploymentFile,
} from './deployment-contracts';

export function parseRepository(value: string) {
  let identifier = value.trim();
  if (identifier.startsWith('https://')) {
    const url = new URL(identifier);
    if (
      url.hostname !== 'github.com' ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    )
      throw new Error(
        'Use a public github.com repository URL or owner/repository.',
      );
    identifier = url.pathname.slice(1);
  }
  identifier = identifier.replace(/\/$/, '').replace(/\.git$/, '');
  const match = /^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9_.-]{1,100})$/.exec(
    identifier,
  );
  if (!match || ['.', '..'].includes(match[2]))
    throw new Error('Use owner/repository, without a branch or file path.');
  return {
    owner: match[1],
    name: match[2],
    fullName: `${match[1]}/${match[2]}`,
  };
}

export const importRequestSchema = z
  .object({
    repository: z
      .string()
      .min(1)
      .max(220)
      .refine((value) => {
        try {
          parseRepository(value);
          return true;
        } catch {
          return false;
        }
      }, 'Use a public GitHub URL or owner/repository.'),
    runId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  })
  .strict();

const shaSchema = z.string().regex(/^[a-f0-9]{40,64}$/i);
const runSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().nullable(),
  head_sha: shaSchema,
  head_branch: z.string().nullable(),
  path: z.string(),
  created_at: z.string(),
});
const repoSchema = z.object({
  full_name: z.string(),
  private: z.boolean(),
  default_branch: z.string(),
});

async function boundedJson(response: Response) {
  if (!response.body) throw new Error('Missing GitHub response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512 * 1024) {
        await reader.cancel();
        throw new Error('GitHub response too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(combined),
  ) as unknown;
}

export async function importPublicRepository(
  repository: string,
  runId?: number,
  signal?: AbortSignal,
): Promise<GithubSnapshot> {
  const parsed = parseRepository(repository);
  const base = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;
  const active = AbortSignal.any([
    AbortSignal.timeout(20_000),
    ...(signal ? [signal] : []),
  ]);
  const get = async (path: string, optional = false) => {
    const response = await fetch(`https://api.github.com${base}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'FailFix-public-review',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: active,
    });
    if (response.status === 404 && optional) return null;
    if (response.status === 403 || response.status === 429)
      throw new AnalysisError(
        'GITHUB_LIMIT',
        'GitHub declined this request or its public API allowance is exhausted. Paste build logs below, or try later.',
        429,
      );
    if (response.status === 404)
      throw new AnalysisError(
        'REPOSITORY_UNAVAILABLE',
        'Public repository or run not found. Private repositories and account connection are not enabled yet.',
        404,
      );
    if (!response.ok)
      throw new AnalysisError(
        'GITHUB_UNAVAILABLE',
        'GitHub could not complete the import. Your pasted input is unchanged.',
        502,
      );
    return boundedJson(response);
  };
  const repo = repoSchema.parse(await get(''));
  if (repo.private)
    throw new AnalysisError(
      'PRIVATE_REPOSITORY',
      'This release imports public repositories only.',
      403,
    );
  const warnings: string[] = [];
  let runs: GithubRun[] = [];
  try {
    const data = z
      .object({ workflow_runs: z.array(runSchema).max(6) })
      .parse(await get('/actions/runs?status=failure&per_page=6'));
    runs = data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name || 'Workflow',
      sha: run.head_sha,
      branch: run.head_branch || 'unknown',
      path: run.path,
      createdAt: run.created_at,
      url: `https://github.com/${parsed.fullName}/actions/runs/${run.id}`,
    }));
  } catch (error) {
    if (active.aborted) throw error;
    warnings.push(
      'Failed-run history is unavailable. Importing configuration from the default branch instead.',
    );
  }
  let selected =
    runs.find((run) => run.id === runId) || (runId ? undefined : runs[0]);
  if (runId && !selected) {
    const run = runSchema.parse(await get(`/actions/runs/${runId}`));
    selected = {
      id: run.id,
      name: run.name || 'Workflow',
      sha: run.head_sha,
      branch: run.head_branch || 'unknown',
      path: run.path,
      createdAt: run.created_at,
      url: `https://github.com/${parsed.fullName}/actions/runs/${run.id}`,
    };
    runs = [selected, ...runs].slice(0, 6);
  }
  const sha =
    selected?.sha ||
    z
      .object({ sha: shaSchema })
      .parse(await get(`/commits/${encodeURIComponent(repo.default_branch)}`))
      .sha;
  const paths = ['package.json', 'vercel.json', '.nvmrc'];
  if (
    selected &&
    isDeploymentFile(selected.path) &&
    selected.path.startsWith('.github/workflows/')
  )
    paths.push(selected.path);
  const files: DeploymentFile[] = [];
  for (const path of paths) {
    const raw = await get(
      `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`,
      true,
    );
    if (!raw) continue;
    const file = z
      .object({
        type: z.string(),
        size: z.number(),
        encoding: z.string().optional(),
        content: z.string().optional(),
      })
      .parse(raw);
    if (
      file.type !== 'file' ||
      file.size > 16 * 1024 ||
      file.encoding !== 'base64' ||
      !file.content
    ) {
      warnings.push(`Skipped ${path}: not a supported text file up to 16 KiB.`);
      continue;
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(
      Buffer.from(file.content, 'base64'),
    );
    if (text.includes('\0') || byteLength(text) > 16 * 1024) {
      warnings.push(`Skipped ${path}: unsupported text content.`);
      continue;
    }
    files.push({ path, text });
  }
  const failedSteps: string[] = [];
  if (selected) {
    try {
      const data = z
        .object({
          jobs: z
            .array(
              z.object({
                name: z.string(),
                steps: z
                  .array(
                    z.object({
                      name: z.string(),
                      conclusion: z.string().nullable(),
                    }),
                  )
                  .optional(),
              }),
            )
            .max(20),
        })
        .parse(await get(`/actions/runs/${selected.id}/jobs?per_page=20`));
      for (const job of data.jobs)
        for (const step of job.steps || [])
          if (step.conclusion === 'failure')
            failedSteps.push(`${job.name} → ${step.name}`);
    } catch (error) {
      if (active.aborted) throw error;
      warnings.push(
        'Job details are unavailable. Paste the relevant build output to investigate.',
      );
    }
  }
  warnings.push(
    'Run metadata is not the build log. Paste or upload the actual failing output; this importer does not download logs or artifacts.',
  );
  return {
    repository: parsed.fullName,
    url: `https://github.com/${parsed.fullName}`,
    sha,
    files,
    runs,
    selectedRunId: selected?.id || null,
    failedSteps,
    warnings,
  };
}
