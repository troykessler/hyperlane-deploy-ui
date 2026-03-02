import { useState, useMemo } from 'react';
import { WarpRouteOption } from './useAvailableWarpRoutes';

interface WarpRouteSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
  routes: WarpRouteOption[];
  selectedAddress?: string;
  chainName?: string;
}

export function WarpRouteSelectorModal({
  isOpen,
  onClose,
  onSelect,
  routes,
  selectedAddress,
  chainName,
}: WarpRouteSelectorModalProps) {
  const [search, setSearch] = useState('');

  const filteredRoutes = useMemo(() => {
    if (!search.trim()) return routes;

    const searchLower = search.toLowerCase();
    return routes.filter((route) => {
      return (
        route.routeId.toLowerCase().includes(searchLower) ||
        route.symbol.toLowerCase().includes(searchLower) ||
        route.standard.toLowerCase().includes(searchLower) ||
        route.address.toLowerCase().includes(searchLower)
      );
    });
  }, [routes, search]);

  const handleSelect = (address: string) => {
    onSelect(address);
    onClose();
    setSearch('');
  };

  const handleCustomAddress = () => {
    onClose();
    setSearch('');
    onSelect('__custom__');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Select Warp Route</h2>
              {chainName && (
                <p className="text-sm text-gray-600 mt-1">
                  Available routes on {chainName}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                onClose();
                setSearch('');
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by route ID, symbol, address..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Routes List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredRoutes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No routes found matching "{search}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRoutes.map((route) => {
                const isSelected = route.address === selectedAddress;

                return (
                  <button
                    key={`${route.routeId}-${route.address}`}
                    onClick={() => handleSelect(route.address)}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Token Logo/Badge */}
                    <div className="flex-shrink-0">
                      {route.logoURI ? (
                        <img
                          src={route.logoURI}
                          alt={route.symbol}
                          className="w-12 h-12 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm ${route.logoURI ? 'hidden' : ''}`}>
                        {route.symbol.slice(0, 3).toUpperCase()}
                      </div>
                    </div>

                    {/* Route Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold text-base ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {route.symbol}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full uppercase font-medium">
                          {route.standard}
                        </span>
                        {isSelected && (
                          <svg className="h-4 w-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Route ID: <span className="font-medium">{route.routeId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 break-all">
                          {route.address}
                        </code>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            {filteredRoutes.length} {filteredRoutes.length === 1 ? 'route' : 'routes'} available
          </p>
          <button
            onClick={handleCustomAddress}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Enter custom address
          </button>
        </div>
      </div>
    </div>
  );
}
