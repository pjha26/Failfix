import { ThemePicker } from './theme-picker';
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
        <i className="trace-mark" aria-hidden="true" />
        FailFix
      </Link>
      <span className="ide-breadcrumb">
        review studio <span>/</span>{' '}
        {context || (workspace ? 'untitled session' : 'getting started')}
      </span>
      <nav className="desk-switch" aria-label="Debugging desks">
        <Link href="/deployments" aria-current={workspace ? undefined : 'page'}>Build desk</Link>
        <Link href="/workspace" aria-current={workspace ? 'page' : undefined}>Test desk</Link>
      </nav>
      <ThemePicker />
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
