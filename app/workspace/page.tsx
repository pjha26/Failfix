import type { Metadata } from 'next';
import '../manual.css';
import Workspace from '@/components/workspace';
import { examples } from '@/lib/examples';
import { buildArtifacts } from '@/lib/patch';

export const metadata: Metadata = {
  title: 'Debugging workspace — FailFix',
  description:
    'Inspect a TypeScript test failure, follow the evidence, and review a focused patch.',
};
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
