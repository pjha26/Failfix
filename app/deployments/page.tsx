import { pageMetadata } from '@/lib/site-metadata';
import DeploymentWorkspace from '@/components/deployment-workspace';
import '../ide.css';
import './deployment.css';

export const metadata = pageMetadata(
  '/deployments',
  'Deployment log analyzer for GitHub builds | FailFix',
  'Investigate a failed deployment with public GitHub configuration and build logs. Find the failing step and review a configuration fix or verification checklist.',
);

export default function DeploymentPage() {
  return <DeploymentWorkspace />;
}
