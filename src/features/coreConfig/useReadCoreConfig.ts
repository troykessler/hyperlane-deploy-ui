import { useState, useCallback } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreModule } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';

interface ReadProgress {
  status: 'idle' | 'reading' | 'success' | 'error';
  message: string;
  error?: string;
}

export function useReadCoreConfig() {
  const [progress, setProgress] = useState<ReadProgress>({
    status: 'idle',
    message: '',
  });
  const [currentConfig, setCurrentConfig] = useState<CoreConfig | null>(null);
  const multiProvider = useMultiProvider();

  const readConfig = useCallback(
    async (chainName: ChainName, walletClient: any): Promise<CoreConfig | null> => {
      try {
        setProgress({
          status: 'reading',
          message: 'Reading current core configuration...',
        });

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        const chainLookup = createChainLookup(multiProvider);
        const signer = await createAltVMSigner(chainMetadata, walletClient);

        logger.debug('Reading core config', { chainName });

        // Create module with minimal config - read() will fetch actual config
        const module = await AltVMCoreModule.create({
          chain: chainName,
          config: {} as CoreConfig, // Placeholder, will be populated by read()
          chainLookup,
          signer,
        });

        const config = await module.read();

        logger.debug('Core config read successfully', { chainName, config });

        setProgress({
          status: 'success',
          message: 'Configuration read successfully',
        });

        setCurrentConfig(config);
        return config;
      } catch (error) {
        logger.error('Failed to read core config', error);
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
