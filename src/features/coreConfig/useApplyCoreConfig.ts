import { useState, useCallback } from 'react';
import { ChainName, EvmCoreModule } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreModule } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import { isEvmChain } from '../../utils/protocolUtils';
import { providers } from 'ethers';

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

        setProgress({
          status: 'applying',
          message: 'Applying configuration updates...',
        });

        logger.debug('Creating core module for update', { chainName });

        let txs: any[];

        if (isEvmChain(chainMetadata)) {
          // EVM chain: use EvmCoreModule
          const evmMultiProvider = multiProvider.toMultiProvider();

          // Set signer from wallet client (ethers Signer)
          if (walletClient && typeof walletClient.getSigner === 'function') {
            const signer = await walletClient.getSigner();
            evmMultiProvider.setSharedSigner(signer);
          } else if (walletClient instanceof providers.Signer) {
            evmMultiProvider.setSharedSigner(walletClient);
          }

          const coreModule = await EvmCoreModule.create({
            chain: chainName,
            config: newConfig,
            multiProvider: evmMultiProvider,
          });

          logger.debug('Applying config update (EVM)', { chainName, newConfig });
          txs = await coreModule.update(newConfig);
        } else {
          // AltVM chain: use AltVMCoreModule
          const chainLookup = createChainLookup(multiProvider);
          const signer = await createAltVMSigner(chainMetadata, walletClient);

          const coreModule = await AltVMCoreModule.create({
            chain: chainName,
            config: newConfig,
            chainLookup,
            signer,
          });

          logger.debug('Applying config update (AltVM)', { chainName, newConfig });
          txs = await coreModule.update(newConfig);
        }

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
