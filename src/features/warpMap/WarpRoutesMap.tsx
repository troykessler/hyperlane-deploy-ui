import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import dynamic from 'next/dynamic';
import { useWarpRoutesGraph } from './useWarpRoutesGraph';
import { GraphLink } from './types';

// Dynamic import to avoid SSR issues with AFRAME
const ForceGraph2D = dynamic(() => import('react-force-graph').then((mod) => mod.ForceGraph2D), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
});

interface WarpRoutesMapProps {
  onChainClick: (chain: ChainName) => void;
  onWarpRouteClick: (sourceChain: ChainName, targetChain: ChainName, routeId: string, address: string) => void;
}

export function WarpRoutesMap({ onChainClick, onWarpRouteClick }: WarpRoutesMapProps) {
  const { data, isLoading, error, refetch } = useWarpRoutesGraph();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  console.log('[WarpRoutesMap] State:', { isLoading, hasData: !!data, isInitializing, willShowOverlay: isInitializing && !!data });

  // Hide loading overlay after simulation completes
  useEffect(() => {
    if (!data) return;

    const timer = setTimeout(() => {
      console.log('[WarpRoutesMap] Initialization complete');
      setIsInitializing(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [data]); // Only depend on data, not isInitializing

  // Memoize graph data to prevent unnecessary re-renders (must be before early returns)
  const graphData = useMemo(() => data, [data]);

  // Memoize all callbacks to prevent ForceGraph2D from triggering re-renders (must be before early returns)
  const nodeLabel = useCallback((node: any) => `${node.label} (${node.routeCount} routes)`, []);

  const nodeColor = useCallback((node: any) => {
    if (selectedNode === node.id) return '#D631B9'; // accent color
    return '#2764c1'; // primary color
  }, [selectedNode]);

  const linkColor = useCallback((link: any) => {
    const isConnected =
      selectedNode &&
      (link.source.id === selectedNode || link.target.id === selectedNode);
    return isConnected ? '#D631B9' : '#cccccc';
  }, [selectedNode]);

  const linkWidth = useCallback((link: any) => {
    const isConnected =
      selectedNode &&
      (link.source.id === selectedNode || link.target.id === selectedNode);
    return isConnected ? 3 : 1;
  }, [selectedNode]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
    onChainClick(node.id as ChainName);
  }, [onChainClick]);

  const handleLinkClick = useCallback((link: any) => {
    const sourceChain = typeof link.source === 'string' ? link.source : link.source.id;
    const targetChain = typeof link.target === 'string' ? link.target : link.target.id;

    // Get the first route's first token address for this link
    const firstConfig = (link as GraphLink).configs[0];
    const firstToken = firstConfig?.tokens?.[0];
    const address = firstToken?.addressOrDenom || (firstToken as any)?.address || '';
    const routeId = (link as GraphLink).routeIds[0];

    onWarpRouteClick(sourceChain, targetChain, routeId, address);
  }, [onWarpRouteClick]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

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
    console.log('[WarpRoutesMap] Rendering empty state');
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

  console.log('[WarpRoutesMap] Rendering graph', { nodeCount: data.nodes.length, linkCount: data.links.length });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative" style={{ height: '600px' }}>
        <ForceGraph2D
          graphData={graphData}
          nodeLabel={nodeLabel}
          nodeColor={nodeColor}
          nodeRelSize={6}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalArrowLength={0}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onBackgroundClick={handleBackgroundClick}
          warmupTicks={100}
          cooldownTicks={0}
          cooldownTime={3000}
          d3AlphaDecay={0.0228}
          d3AlphaMin={0.001}
          d3VelocityDecay={0.4}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />

        {isInitializing && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Initializing graph layout...</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-900 mb-2">How to use:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Click a <strong>chain node</strong> to read its core configuration</li>
              <li>• Click a <strong>warp route edge</strong> to read the warp route configuration</li>
              <li>• Click and drag nodes to rearrange the graph</li>
              <li>• Scroll to zoom, click and drag background to pan</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span>Chain ({data.nodes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <span>Warp Route ({data.links.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-600"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
