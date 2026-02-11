import { useState, useCallback } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreModule } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';

interface ApplyProgress {
  status: 'idle' | 'validating' | 'applying' | 'success' | 'error';
  message: string;
  error?: string;
}

export function useApplyCoreConfig() {
  const [progress, setProgress] = useState<ApplyProgress>({
    status: 'idle',
    message: '',
  });
  const multiProvider = useMultiProvider();

  const applyConfig = useCallback(
    async (
      chainName: ChainName,
      newConfig: CoreConfig,
      walletClient: any
    ): Promise<boolean> => {
      try {
        setProgress({
          status: 'validating',
          message: 'Validating new configuration...',
        });

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        const chainLookup = createChainLookup(multiProvider);
        const signer = await createAltVMSigner(chainMetadata, walletClient);

        setProgress({
          status: 'applying',
          message: 'Applying configuration updates...',
        });

        logger.debug('Creating core module for update', { chainName });

        // Create module with the new config to apply
        const coreModule = await AltVMCoreModule.create({
          chain: chainName,
          config: newConfig,
          chainLookup,
          signer,
        });

        logger.debug('Applying config update', { chainName, newConfig });

        const txs = await coreModule.update(newConfig);

        logger.debug('Config update successful', { chainName, txCount: txs.length });

        setProgress({
          status: 'success',
          message: `Successfully applied ${txs.length} transaction(s)`,
        });

        return true;
      } catch (error) {
        logger.error('Failed to apply config update', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setProgress({
          status: 'error',
          message: 'Failed to apply configuration',
          error: errorMessage,
        });

        return false;
      }
    },
    [multiProvider]
  );

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      message: '',
    });
  }, []);

  return {
    applyConfig,
    progress,
    reset,
    isApplying: progress.status === 'applying' || progress.status === 'validating',
  };
}
