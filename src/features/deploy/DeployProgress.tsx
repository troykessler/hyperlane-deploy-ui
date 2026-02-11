import { DeploymentStatus } from './types';

interface DeployProgressProps {
  status: DeploymentStatus;
  message: string;
  error?: string;
}

export function DeployProgress({ status, message, error }: DeployProgressProps) {
  if (status === DeploymentStatus.Idle) {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case DeploymentStatus.Validating:
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case DeploymentStatus.Deploying:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case DeploymentStatus.Deployed:
        return 'bg-green-50 border-green-200 text-green-800';
      case DeploymentStatus.Failed:
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case DeploymentStatus.Validating:
      case DeploymentStatus.Deploying:
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
        );
      case DeploymentStatus.Deployed:
        return <span className="text-xl">✓</span>;
      case DeploymentStatus.Failed:
        return <span className="text-xl">✗</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {error && <p className="text-sm mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
