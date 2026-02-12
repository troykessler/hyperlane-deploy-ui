import { useQuery } from '@tanstack/react-query';
import { ChainName, WarpCoreConfig } from '@hyperlane-xyz/sdk';
import { useStore } from '../store';
import { GraphData, GraphNode, GraphLink } from './types';

type WarpRouteConfigMap = Record<string, WarpCoreConfig>;

export function useWarpRoutesGraph() {
  const { registry } = useStore((s) => ({ registry: s.registry }));

  return useQuery<GraphData>({
    queryKey: ['warpRoutesGraph', registry],
    queryFn: async () => {
      if (!registry) {
        throw new Error('Registry not initialized');
      }

      // Get all warp routes from registry
      let warpRoutes: WarpRouteConfigMap;
      try {
        warpRoutes = (await registry.getWarpRoutes()) as WarpRouteConfigMap;
      } catch (error) {
        throw new Error(`Failed to fetch warp routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const nodesMap = new Map<ChainName, GraphNode>();
      const linksMap = new Map<string, GraphLink>();

      // Transform warp routes to graph structure
      for (const [routeId, config] of Object.entries(warpRoutes)) {
        if (!config.tokens || config.tokens.length === 0) continue;

        // Add nodes for each chain in the route
        config.tokens.forEach((token) => {
          const chainName = token.chainName;

          if (!nodesMap.has(chainName)) {
            nodesMap.set(chainName, {
              id: chainName,
              label: chainName,
              routeCount: 0,
            });
          }
          const node = nodesMap.get(chainName)!;
          node.routeCount++;
        });

        // Add edges for connections between tokens
        config.tokens.forEach((token) => {
          const sourceChain = token.chainName;

          token.connections?.forEach((connection) => {
            // Connection format: "chainName|addressOrDenom"
            const [targetChain] = connection.token.split('|');

            if (!targetChain || sourceChain === targetChain) return;

            // Create bidirectional link key (sort to avoid duplicates)
            const linkKey = [sourceChain, targetChain].sort().join('-');

            if (linksMap.has(linkKey)) {
              // Aggregate: add route to existing link
              const existingLink = linksMap.get(linkKey)!;
              if (!existingLink.routeIds.includes(routeId)) {
                existingLink.routeIds.push(routeId);
                existingLink.configs.push(config);
              }
            } else {
              // Create new link
              linksMap.set(linkKey, {
                source: sourceChain,
                target: targetChain,
                routeIds: [routeId],
                configs: [config],
              });
            }
          });
        });
      }

      return {
        nodes: Array.from(nodesMap.values()),
        links: Array.from(linksMap.values()),
      };
    },
    enabled: !!registry,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
    retryDelay: 1000,
  });
}
