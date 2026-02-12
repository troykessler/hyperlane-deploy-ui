import { useState, useMemo } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useWarpRoutesGraph } from './useWarpRoutesGraph';

interface WarpRoutesTableProps {
  onChainClick: (chain: ChainName) => void;
  onWarpRouteClick: (sourceChain: ChainName, targetChain: ChainName, routeId: string, address: string) => void;
}

export function WarpRoutesTable({ onChainClick, onWarpRouteClick }: WarpRoutesTableProps) {
  const { data, isLoading, error, refetch } = useWarpRoutesGraph();
  const [search, setSearch] = useState('');

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!data || !search.trim()) return data;

    const searchLower = search.toLowerCase();

    const filteredNodes = data.nodes.filter(node =>
      node.label.toLowerCase().includes(searchLower) ||
      node.id.toLowerCase().includes(searchLower)
    );

    const filteredLinks = data.links.filter(link => {
      const sourceChain = typeof link.source === 'string' ? link.source : link.source;
      const targetChain = typeof link.target === 'string' ? link.target : link.target;
      return (
        sourceChain.toLowerCase().includes(searchLower) ||
        targetChain.toLowerCase().includes(searchLower) ||
        link.routeIds.some(id => id.toLowerCase().includes(searchLower))
      );
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [data, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading warp routes from registry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-xl">⚠</div>
          <p className="text-gray-800 font-medium">Failed to load warp routes</p>
          <p className="text-gray-600 text-sm">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="text-gray-400 text-6xl">🗺️</div>
          <p className="text-gray-800 font-medium">No warp routes found</p>
          <p className="text-gray-600 text-sm">
            The registry does not contain any warp routes yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chains or warp routes..."
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <svg
          className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
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
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Chains Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Chains ({filteredData?.nodes.length || 0})
          {search && data && ` of ${data.nodes.length}`}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filteredData?.nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onChainClick(node.id)}
              className="px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition-colors"
            >
              <div className="font-medium text-blue-900">{node.label}</div>
              <div className="text-xs text-blue-600 mt-1">{node.routeCount} routes</div>
            </button>
          ))}
        </div>
      </div>

      {/* Warp Routes Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Warp Route Connections ({filteredData?.links.length || 0})
          {search && data && ` of ${data.links.length}`}
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredData?.links.map((link, idx) => {
            const sourceChain = typeof link.source === 'string' ? link.source : link.source;
            const targetChain = typeof link.target === 'string' ? link.target : link.target;
            const firstConfig = link.configs[0];
            const firstToken = firstConfig?.tokens?.[0];
            const address = firstToken?.addressOrDenom || (firstToken as any)?.address || '';
            const routeId = link.routeIds[0];

            return (
              <button
                key={`${sourceChain}-${targetChain}-${idx}`}
                onClick={() => onWarpRouteClick(sourceChain, targetChain, routeId, address)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {sourceChain} ↔ {targetChain}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {link.routeIds.length} route{link.routeIds.length > 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-blue-600 text-sm">→</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-900 mb-2">How to use:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Click a <strong>chain</strong> to read its core configuration</li>
              <li>• Click a <strong>warp route connection</strong> to read and edit the warp route configuration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
