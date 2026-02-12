import { useQuery } from '@tanstack/react-query';
import { ChainName, WarpCoreConfig } from '@hyperlane-xyz/sdk';
import { useStore } from '../store';

export interface WarpRouteOption {
  routeId: string;
  chainName: ChainName;
  address: string;
  symbol: string;
  standard: string;
}

type WarpRouteConfigMap = Record<string, WarpCoreConfig>;

export function useAvailableWarpRoutes(chainName?: ChainName) {
  const { registry } = useStore((s) => ({ registry: s.registry }));

  return useQuery<WarpRouteOption[]>({
    queryKey: ['availableWarpRoutes', chainName, registry],
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

      const options: WarpRouteOption[] = [];

      // Transform warp routes to options for the selected chain
      for (const [routeId, config] of Object.entries(warpRoutes)) {
        if (!config.tokens || config.tokens.length === 0) continue;

        config.tokens.forEach((token) => {
          // If chainName is specified, only include routes for that chain
          if (chainName && token.chainName !== chainName) return;

          // Get address (prioritize addressOrDenom, fallback to standard address field)
          const address =
            token.addressOrDenom ||
            (token as any)?.address ||
            '';

          if (!address) return;

          options.push({
            routeId,
            chainName: token.chainName,
            address,
            symbol: token.symbol || 'Unknown',
            standard: token.standard || 'Unknown',
          });
        });
      }

      return options;
    },
    enabled: !!registry,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
