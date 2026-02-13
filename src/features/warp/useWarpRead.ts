import { useState, useCallback } from 'react';
import { ChainName, EvmWarpRouteReader } from '@hyperlane-xyz/sdk';
import { DerivedWarpConfig } from '@hyperlane-xyz/provider-sdk/warp';
import { getProtocolProvider } from '@hyperlane-xyz/provider-sdk';
import { AltVMWarpRouteReader } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { logger } from '../../utils/logger';
import { isEvmChain } from '../../utils/protocolUtils';

interface ReadProgress {
  status: 'idle' | 'reading' | 'success' | 'error';
  message: string;
  error?: string;
}

export function useWarpRead() {
  const [currentConfig, setCurrentConfig] = useState<DerivedWarpConfig | null>(null);
  const [progress, setProgress] = useState<ReadProgress>({
    status: 'idle',
    message: '',
  });
  const multiProvider = useMultiProvider();

  const readConfig = useCallback(
    async (chainName: ChainName, warpRouteAddress: string): Promise<DerivedWarpConfig | null> => {
      try {
        setProgress({
          status: 'reading',
          message: 'Reading warp route configuration...',
        });

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        // Validate warp route address
        if (!warpRouteAddress || warpRouteAddress.trim() === '') {
          throw new Error('Warp route address is required');
        }

        logger.debug('Reading warp route config', {
          chainName,
          warpRouteAddress,
          protocol: chainMetadata.protocol,
        });

        let config;

        if (isEvmChain(chainMetadata)) {
          // Use EVM reader for Ethereum chains
          const evmMultiProvider = multiProvider.toMultiProvider();
          const reader = new EvmWarpRouteReader(evmMultiProvider, chainName);
          config = await reader.deriveWarpRouteConfig(warpRouteAddress);
        } else {
          // Use AltVM reader for non-EVM chains
          const chainLookup = createChainLookup(multiProvider);
          const protocolProvider = getProtocolProvider(chainMetadata.protocol);
          const provider = await protocolProvider.createProvider(chainMetadata);
          const reader = new AltVMWarpRouteReader(chainMetadata, chainLookup, provider);
          config = await reader.read(warpRouteAddress);
        }

        logger.debug('Warp route config read successfully', { chainName, config });

        setProgress({
          status: 'success',
          message: 'Configuration read successfully',
        });

        setCurrentConfig(config);
        return config;
      } catch (error) {
        logger.error('Failed to read warp route config', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setProgress({
          status: 'error',
          message: 'Failed to read configuration',
          error: errorMessage,
        });

        setCurrentConfig(null);
        return null;
      }
    },
    [multiProvider]
  );

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      message: '',
    });
    setCurrentConfig(null);
  }, []);

  return {
    readConfig,
    currentConfig,
    progress,
    reset,
    isReading: progress.status === 'reading',
  };
}
