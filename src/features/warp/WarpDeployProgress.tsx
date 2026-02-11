import { ChainName } from '@hyperlane-xyz/sdk';
import type { MultiChainDeployStatuses } from './types';

interface WarpDeployProgressProps {
  chainStatuses: MultiChainDeployStatuses;
  deployedAddresses?: Record<ChainName, string>;
}

export function WarpDeployProgress({ chainStatuses, deployedAddresses }: WarpDeployProgressProps) {
  const chains = Object.keys(chainStatuses) as ChainName[];

  if (chains.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validating':
        return 'text-blue-600 bg-blue-50';
      case 'deploying':
        return 'text-yellow-600 bg-yellow-50';
      case 'deployed':
        return 'text-green-600 bg-green-50';
      case 'enrolling':
        return 'text-purple-600 bg-purple-50';
      case 'complete':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validating':
        return '🔍';
      case 'deploying':
        return '⏳';
      case 'deployed':
        return '✅';
      case 'enrolling':
        return '🔗';
      case 'complete':
        return '✅';
      case 'failed':
        return '❌';
      case 'idle':
        return '⏸';
      default:
        return '⏸';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validating':
        return 'Validating...';
      case 'deploying':
        return 'Deploying...';
      case 'deployed':
        return 'Deployed';
      case 'enrolling':
        return 'Enrolling Routers...';
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
      case 'idle':
        return 'Pending';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Deployment Progress</h3>
        <span className="text-xs text-gray-500">
          {chains.filter((c) => chainStatuses[c] === 'complete').length} / {chains.length} complete
        </span>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Chain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {chains.map((chain) => {
              const status = chainStatuses[chain];
              const address = deployedAddresses?.[chain];

              return (
                <tr key={chain} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{chain}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getStatusIcon(status)}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(
                          status
                        )}`}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {address ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {address.slice(0, 8)}...{address.slice(-6)}
                      </code>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
