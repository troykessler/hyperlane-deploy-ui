import { ChainName } from '@hyperlane-xyz/sdk';
import { useStore } from '../../features/store';
import { useAvailableWarpRoutes } from '../../features/warpRoutes/useAvailableWarpRoutes';

interface WarpConfigSelectorProps {
  chainName: ChainName;
  onSelect: (address: string) => void;
  selectedAddress?: string;
}

/**
 * Component to list and select from available warp deployments for a chain
 * Shows deployments from both:
 * 1. Registry (official Hyperlane warp routes)
 * 2. Local deployments (user's previous deployments)
 */
export function WarpConfigSelector({
  chainName,
  onSelect,
  selectedAddress,
}: WarpConfigSelectorProps) {
  const { warpDeployments } = useStore();
  const { data: registryRoutes, isLoading } = useAvailableWarpRoutes(chainName);

  // Get local deployments for this chain, sorted by newest first
  const localDeployments = warpDeployments
    .filter((d) => d.chainName === chainName)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Loading available warp routes...</p>
      </div>
    );
  }

  const hasRegistry = registryRoutes && registryRoutes.length > 0;
  const hasLocal = localDeployments.length > 0;

  if (!hasRegistry && !hasLocal) {
    return (
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-800">
          No warp routes found for <strong>{chainName}</strong>.
          <br />
          You can enter a warp route address manually below to read an existing deployment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Select Warp Route
      </label>

      {(hasRegistry || hasLocal) && (
        <p className="text-xs text-gray-600">
          Select a deployment to automatically read its configuration. If reading fails, you can manually enter the warp route address below.
        </p>
      )}

      {/* Registry Routes */}
      {hasRegistry && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Registry Routes ({registryRoutes.length})</p>
          {registryRoutes.map((route) => (
            <button
              key={route.address}
              onClick={() => onSelect(route.address)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAddress === route.address
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Token Logo */}
                <div className="flex-shrink-0">
                  {route.logoURI ? (
                    <img
                      src={route.logoURI}
                      alt={route.symbol}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs ${route.logoURI ? 'hidden' : ''}`}>
                    {route.symbol.slice(0, 3).toUpperCase()}
                  </div>
                </div>

                {/* Route Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{route.symbol}</span>
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded uppercase">
                      {route.standard}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                      REGISTRY
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    Route ID: {route.routeId}
                  </div>
                  <code className="text-xs text-gray-500 font-mono block truncate">
                    {route.address}
                  </code>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Local Deployments */}
      {hasLocal && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Local Deployments ({localDeployments.length})</p>
          {localDeployments.map((deployment) => (
            <button
              key={deployment.id}
              onClick={() => onSelect(deployment.address)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAddress === deployment.address
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {deployment.type}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                      LOCAL
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Deployed: {new Date(deployment.timestamp).toLocaleString()}
                  </p>
                  <code className="text-xs text-gray-500 font-mono mt-1 block truncate">
                    {deployment.address}
                  </code>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
