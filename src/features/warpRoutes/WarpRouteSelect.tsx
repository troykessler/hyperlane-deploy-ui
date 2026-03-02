import { useState, useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useAvailableWarpRoutes } from './useAvailableWarpRoutes';
import { WarpRouteSelectorModal } from './WarpRouteSelectorModal';

interface WarpRouteSelectProps {
  chainName?: ChainName;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function WarpRouteSelect({ chainName, value, onChange, className }: WarpRouteSelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const { data: routes, isLoading } = useAvailableWarpRoutes(chainName);

  const hasRoutes = routes && routes.length > 0;
  const selectedRoute = routes?.find((r) => r.address === value);
  const isCustomValue = value && !selectedRoute;

  // Handle the __custom__ placeholder from modal
  useEffect(() => {
    if (value === '__custom__') {
      setShowCustomInput(true);
      onChange('');
    }
  }, [value, onChange]);

  // If loading, show disabled button
  if (isLoading) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-left"
        >
          Loading warp routes...
        </button>
        <p className="mt-2 text-xs text-gray-500">Loading available warp routes from registry...</p>
      </div>
    );
  }

  // If no routes available, always show custom input
  if (!hasRoutes) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter deployed warp route contract address"
          className={className}
        />
        <p className="mt-2 text-xs text-gray-500">
          No warp routes found in registry for this chain. Provide the warp route contract address to read and update
          its configuration.
        </p>
      </div>
    );
  }

  // If user is entering custom address
  if (showCustomInput || isCustomValue) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter deployed warp route contract address"
          className={className}
          autoFocus={showCustomInput}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-500">Custom address entered.</p>
          <button
            onClick={() => {
              setShowCustomInput(false);
              onChange('');
              setIsModalOpen(true);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap font-medium"
          >
            Choose from registry
          </button>
        </div>
      </div>
    );
  }

  // Show button with selected route or selector
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors text-left"
      >
        {selectedRoute ? (
          <div className="flex items-start gap-3">
            {/* Token Logo */}
            <div className="flex-shrink-0">
              {selectedRoute.logoURI ? (
                <img
                  src={selectedRoute.logoURI}
                  alt={selectedRoute.symbol}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs ${selectedRoute.logoURI ? 'hidden' : ''}`}>
                {selectedRoute.symbol.slice(0, 3).toUpperCase()}
              </div>
            </div>

            {/* Route Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{selectedRoute.symbol}</span>
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded uppercase">
                  {selectedRoute.standard}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                Route ID: {selectedRoute.routeId}
              </div>
              <code className="text-xs text-gray-500 font-mono mt-1 block">
                {selectedRoute.address}
              </code>
            </div>
          </div>
        ) : (
          <span className="text-gray-500">Select a warp route...</span>
        )}
      </button>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {routes.length} warp route{routes.length !== 1 ? 's' : ''} available on {chainName}
        </p>
        <button
          onClick={() => setShowCustomInput(true)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Custom address
        </button>
      </div>

      <WarpRouteSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(address) => {
          onChange(address);
          setShowCustomInput(address === '__custom__');
        }}
        routes={routes}
        selectedAddress={value}
        chainName={chainName}
      />
    </div>
  );
}
