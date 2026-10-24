import type { Metadata } from 'next';
import DeploymentWorkspace from '@/components/deployment-workspace';
import '../ide.css';
import './deployment.css';

export const metadata: Metadata = {
  title: 'Deployment investigation — FailFix',
  description:
    'Import public GitHub build context, inspect failure logs, and review a configuration repair plan without a model API key.',
};
export default function DeploymentPage() {
  return <DeploymentWorkspace />;
}
