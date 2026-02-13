import { useState, useCallback } from 'react';
import { ChainName, EvmWarpModule } from '@hyperlane-xyz/sdk';
import { AltVMWarpModule } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig } from './types';
import { validateWarpConfig } from './validation';
import { isEvmChain } from '../../utils/protocolUtils';
import { providers } from 'ethers';

interface UpdateProgress {
  status: 'idle' | 'validating' | 'applying' | 'success' | 'error';
  message: string;
  error?: string;
}

export function useWarpUpdate() {
  const [progress, setProgress] = useState<UpdateProgress>({
    status: 'idle',
    message: '',
  });
  const multiProvider = useMultiProvider();

  const applyUpdate = useCallback(
    async (
      chainName: ChainName,
      warpRouteAddress: string,
      config: WarpConfig,
      walletClient: any
    ): Promise<boolean> => {
      try {
        setProgress({
          status: 'validating',
          message: 'Validating new configuration...',
        });

        // Validate config
        validateWarpConfig(config);

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        setProgress({
          status: 'applying',
          message: 'Applying configuration updates...',
        });

        logger.debug('Creating warp module for update', { chainName, warpRouteAddress });

        if (isEvmChain(chainMetadata)) {
          // EVM chain: use EvmWarpModule
          const evmMultiProvider = multiProvider.toMultiProvider();

          // Set signer from wallet client
          if (walletClient && typeof walletClient.getSigner === 'function') {
            const signer = await walletClient.getSigner();
            evmMultiProvider.setSharedSigner(signer);
          } else if (walletClient instanceof providers.Signer) {
            evmMultiProvider.setSharedSigner(walletClient);
          }

          const module = await EvmWarpModule.create({
            chain: chainName,
            config: config as any,
            multiProvider: evmMultiProvider,
            addresses: { deployedTokenRoute: warpRouteAddress },
          });

          logger.debug('Applying warp config update (EVM)', { chainName, config });
          await module.update(config as any);
        } else {
          // AltVM chain: use AltVMWarpModule
          const chainLookup = createChainLookup(multiProvider);
          const signer = await createAltVMSigner(chainMetadata, walletClient);

          const module = new AltVMWarpModule(chainLookup, signer, {
            chain: chainName,
            addresses: { deployedTokenRoute: warpRouteAddress },
            config,
          });

          logger.debug('Applying warp config update (AltVM)', { chainName, config });
          await module.update(config);
        }

        logger.debug('Warp config update successful', { chainName });

        setProgress({
          status: 'success',
          message: 'Updates applied successfully',
        });

        return true;
      } catch (error) {
        logger.error('Failed to apply warp config update', error);
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
    applyUpdate,
    progress,
    reset,
    isApplying: progress.status === 'applying' || progress.status === 'validating',
  };
}
