import { pageMetadata } from '@/lib/site-metadata';
import '../manual.css';
import '../ide.css';
import Workspace from '@/components/workspace';
import { examples } from '@/lib/examples';
import { buildArtifacts } from '@/lib/patch';

export const metadata = pageMetadata(
  '/workspace',
  'TypeScript & Vitest debugging workspace | FailFix',
  'Inspect failing TypeScript tests, trace evidence to source lines, and review a proposed patch and regression test. Explore saved examples or bring your own failure.',
);

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string | string[] }>;
}) {
  const { example: id } = await searchParams;
  const example = examples.find((value) => value.id === id);
  const initialResult = example
    ? {
        ...buildArtifacts(example.input, example.analysis),
        requestId: `example-${example.id}`,
        durationMs: 0,
      }
    : undefined;
  return (
    <Workspace
      key={example?.id || 'blank'}
      initialExampleId={example?.id}
      initialResult={initialResult}
    />
  );
}
