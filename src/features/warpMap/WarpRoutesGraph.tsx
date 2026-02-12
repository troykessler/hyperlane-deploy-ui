import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useWarpRoutesGraph } from './useWarpRoutesGraph';

interface WarpRoutesGraphProps {
  onChainClick: (chain: ChainName) => void;
  onWarpRouteClick: (sourceChain: ChainName, targetChain: ChainName, routeId: string, address: string) => void;
  useTestData?: boolean;
}

// Test data with just a few nodes and edges
const TEST_DATA = {
  nodes: [
    { id: 'ethereum', label: 'Ethereum', routeCount: 5 },
    { id: 'arbitrum', label: 'Arbitrum', routeCount: 3 },
    { id: 'optimism', label: 'Optimism', routeCount: 2 },
    { id: 'base', label: 'Base', routeCount: 4 },
  ],
  links: [
    {
      source: 'ethereum',
      target: 'arbitrum',
      routeIds: ['ETH-USDC'],
      configs: [{ tokens: [{ addressOrDenom: '0x123...', chainName: 'ethereum' as ChainName }] }],
    },
    {
      source: 'ethereum',
      target: 'optimism',
      routeIds: ['ETH-USDT'],
      configs: [{ tokens: [{ addressOrDenom: '0x456...', chainName: 'ethereum' as ChainName }] }],
    },
    {
      source: 'arbitrum',
      target: 'base',
      routeIds: ['ARB-USDC'],
      configs: [{ tokens: [{ addressOrDenom: '0x789...', chainName: 'arbitrum' as ChainName }] }],
    },
  ],
};

export function WarpRoutesGraph({ onChainClick, onWarpRouteClick, useTestData = true }: WarpRoutesGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { data: registryData, isLoading, error, refetch } = useWarpRoutesGraph();

  useEffect(() => {
    if (!containerRef.current) return;

    const data = useTestData ? TEST_DATA : registryData;
    if (!data) return;

    // Transform data for vis-network
    const nodes = data.nodes.map(node => ({
      id: node.id,
      label: `${node.label}\n(${node.routeCount} routes)`,
      color: {
        background: '#2764c1',
        border: '#1e4d8f',
        highlight: {
          background: '#D631B9',
          border: '#a32591',
        },
      },
      font: { color: '#ffffff', size: 12 },
      shape: 'circle',
      size: 20 + node.routeCount * 2,
    }));

    const edges = data.links.map((link, idx) => ({
      id: `edge-${idx}`,
      from: link.source,
      to: link.target,
      label: `${link.routeIds.length} route${link.routeIds.length > 1 ? 's' : ''}`,
      color: {
        color: '#cccccc',
        highlight: '#D631B9',
      },
      font: { size: 10, color: '#666666', strokeWidth: 0 },
      smooth: { type: 'continuous' },
    }));

    const visData = { nodes, edges };

    const options = {
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 3,
      },
      edges: {
        width: 2,
        selectionWidth: 3,
      },
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 100,
          updateInterval: 25,
        },
        barnesHut: {
          gravitationalConstant: -2000,
          springLength: 150,
          springConstant: 0.04,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true,
      },
    };

    const network = new Network(containerRef.current, visData, options);
    networkRef.current = network;

    // Handle node clicks
    network.on('selectNode', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0] as ChainName;
        onChainClick(nodeId);
      }
    });

    // Handle edge clicks
    network.on('selectEdge', (params) => {
      if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edgeIndex = parseInt(edgeId.toString().replace('edge-', ''));
        const link = data.links[edgeIndex];
        if (link) {
          const firstConfig = link.configs[0];
          const firstToken = firstConfig?.tokens?.[0];
          const address = firstToken?.addressOrDenom || '';
          onWarpRouteClick(
            link.source as ChainName,
            link.target as ChainName,
            link.routeIds[0],
            address
          );
        }
      }
    });

    // Wait for stabilization
    network.once('stabilizationIterationsDone', () => {
      network.setOptions({ physics: { enabled: false } });
      setIsReady(true);
      console.log('[WarpRoutesGraph] Graph stabilized and ready');
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [onChainClick, onWarpRouteClick, useTestData, registryData]);

  if (!useTestData && isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading warp routes from registry...</p>
        </div>
      </div>
    );
  }

  if (!useTestData && error) {
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

  if (!useTestData && (!registryData || registryData.nodes.length === 0)) {
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
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="bg-white rounded-lg border border-gray-200"
        style={{ height: '600px', position: 'relative' }}
      />

      {!isReady && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Initializing graph...</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-900 mb-2">How to use:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Click a <strong>chain node</strong> to read its core configuration</li>
              <li>• Click a <strong>warp route edge</strong> to read the warp route configuration</li>
              <li>• Drag nodes to rearrange, scroll to zoom, drag background to pan</li>
              <li>• Use navigation controls in bottom-left corner</li>
            </ul>
          </div>
        </div>
      </div>

      {useTestData ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Test Mode:</strong> Showing sample data (4 chains, 3 routes)
          </p>
        </div>
      ) : registryData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>Registry Data:</strong> Showing {registryData.nodes.length} chains, {registryData.links.length} warp route connections
          </p>
        </div>
      )}
    </div>
  );
}
