import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'FailFix — build failed. Keep moving.',
  description:
    'Investigate build failures with public GitHub context, log evidence, and reviewable repair steps. Debug TypeScript tests in a focused IDE workspace.',
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
