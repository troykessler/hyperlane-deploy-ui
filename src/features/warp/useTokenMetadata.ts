import { useState, useCallback } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { logger } from '../../utils/logger';

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * Hook for fetching ERC20 token metadata
 * Note: Currently returns placeholder data - implement actual token metadata fetching as needed
 */
export function useTokenMetadata() {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetadata = useCallback(
    async (_chainName: ChainName, _tokenAddress: string): Promise<TokenMetadata | null> => {
      setLoading(true);
      try {
        logger.debug('Token metadata fetch not yet implemented', {
          chainName: _chainName,
          tokenAddress: _tokenAddress,
        });

        // TODO: Implement actual token metadata fetching
        // This would require calling ERC20 methods: name(), symbol(), decimals()
        // via the provider for the given chain

        setMetadata(null);
        return null;
      } catch (error) {
        logger.error('Failed to fetch token metadata', error);
        setMetadata(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setMetadata(null);
    setLoading(false);
  }, []);

  return {
    metadata,
    loading,
    error: null,
    fetchMetadata,
    reset,
  };
}
