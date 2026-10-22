import { examples } from '@/lib/examples';
import { buildArtifacts } from '@/lib/patch';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const example = examples.find(value => value.id === id);
  if (!example) return Response.json({ error: 'Example not found.' }, { status: 404 });
  return Response.json({ ...buildArtifacts(example.input, example.analysis), requestId: `example-${example.id}`, durationMs: 0 });
}
