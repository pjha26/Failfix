import Link from 'next/link';

export function IdeHeader({
  workspace = false,
  context,
}: {
  workspace?: boolean;
  context?: string;
}) {
  return (
    <header className="ide-titlebar">
      <Link href="/" className="ide-brand" aria-label="FailFix home">
        <span>
          f<span>↯</span>
        </span>{' '}
        FailFix
      </Link>
      <span className="ide-breadcrumb">
        review studio <span>/</span>{' '}
        {context || (workspace ? 'untitled session' : 'getting started')}
      </span>
      <Link href="/deployments">Build investigations ↗</Link>
    </header>
  );
}

export function IdeStatus({ message }: { message: string }) {
  return (
    <footer className="ide-status">
      <span>
        <i /> {message}
      </span>
      <span>
        TypeScript <b>·</b> Vitest <b>·</b> Review before execution
      </span>
    </footer>
  );
}
