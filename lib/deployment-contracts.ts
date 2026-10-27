import { z } from 'zod';
import { byteLength } from './contracts';

export const isDeploymentFile = (path: string) =>
  ['package.json', 'vercel.json', '.nvmrc'].includes(path) ||
  /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(path);

export const deploymentFileSchema = z
  .object({
    path: z
      .string()
      .refine(
        isDeploymentFile,
        'Use a supported root config or GitHub workflow path.',
      ),
    text: z
      .string()
      .refine(
        (text) => byteLength(text) <= 16 * 1024 && !text.includes('\0'),
        'Use a text config up to 16 KiB.',
      ),
  })
  .strict();

export const deploymentInputSchema = z
  .object({
    log: z
      .string()
      .refine(
        (text) => text.trim().length > 0,
        'Add the relevant build error first.',
      )
      .refine(
        (text) => byteLength(text) <= 32 * 1024,
        'Build log must be at most 32 KiB.',
      ),
    files: z
      .array(deploymentFileSchema)
      .max(4)
      .refine(
        (files) =>
          new Set(files.map((file) => file.path)).size === files.length,
        'File paths must be unique.',
      ),
  })
  .strict();

export type DeploymentInput = z.infer<typeof deploymentInputSchema>;
export type DeploymentFile = z.infer<typeof deploymentFileSchema>;
export type DeploymentFinding = {
  id: string;
  title: string;
  explanation: string;
  evidence: { line: number; text: string }[];
  steps: string[];
};
export type DeploymentReport = {
  status: 'findings' | 'needs_context';
  findings: DeploymentFinding[];
  patch: { path: string; before: string; after: string; diff: string } | null;
  verification: string[];
};

export type GithubRun = {
  id: number;
  name: string;
  sha: string;
  branch: string;
  path: string;
  url: string;
  createdAt: string;
};
export type GithubSnapshot = {
  repository: string;
  url: string;
  sha: string;
  files: DeploymentFile[];
  runs: GithubRun[];
  selectedRunId: number | null;
  failedSteps: string[];
  warnings: string[];
};
