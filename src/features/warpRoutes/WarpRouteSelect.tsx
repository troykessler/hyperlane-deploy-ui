import { ChainName } from '@hyperlane-xyz/sdk';
import { useAvailableWarpRoutes } from './useAvailableWarpRoutes';

interface WarpRouteSelectProps {
  chainName?: ChainName;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function WarpRouteSelect({ chainName, value, onChange, className }: WarpRouteSelectProps) {
  const { data: routes, isLoading } = useAvailableWarpRoutes(chainName);

  // If loading, show input field
  if (isLoading) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Loading warp routes..."
          disabled
          className={className}
        />
        <p className="mt-2 text-xs text-gray-500">Loading available warp routes from registry...</p>
      </div>
    );
  }

  // If no routes available or user has entered a custom value, show input
  const hasRoutes = routes && routes.length > 0;
  const isCustomValue = value && (!routes || !routes.some((r) => r.address === value));

  if (!hasRoutes || isCustomValue) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter deployed warp route contract address"
          className={className}
        />
        <div className="mt-2 flex items-start gap-2">
          <p className="text-xs text-gray-500">
            {hasRoutes
              ? 'Custom address entered. '
              : 'No warp routes found in registry for this chain. '}
            Provide the warp route contract address to read and update its configuration.
          </p>
          {hasRoutes && isCustomValue && (
            <button
              onClick={() => onChange('')}
              className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Choose from registry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show dropdown with routes
  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        <option value="">Select a warp route...</option>
        {routes.map((route) => (
          <option key={`${route.routeId}-${route.address}`} value={route.address}>
            {route.routeId} - {route.symbol} ({route.standard})
          </option>
        ))}
        <option value="__custom__">Custom address...</option>
      </select>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {routes.length} warp route{routes.length !== 1 ? 's' : ''} available on {chainName}
        </p>
        {value && value !== '__custom__' && (
          <p className="text-xs text-gray-500 font-mono">{value}</p>
        )}
      </div>
      {value === '__custom__' && (
        <input
          type="text"
          value=""
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom warp route address"
          className={`${className} mt-2`}
          autoFocus
        />
      )}
    </div>
  );
}
