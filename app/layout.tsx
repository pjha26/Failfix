import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'FailFix — understand the failure. Review the fix.',
  description:
    'Turn failing TypeScript tests into an evidence-linked explanation, a reviewable patch, and a regression test with BharatCode.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
