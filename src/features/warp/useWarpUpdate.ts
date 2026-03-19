import { useState, useCallback } from 'react';
import { ChainName, EvmWarpModule } from '@hyperlane-xyz/sdk';
import { AltVMWarpModule } from '@hyperlane-xyz/deploy-sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner, createEvmSigner, createEvmSignerFromPrivateKey, createCosmosSignerFromPrivateKey, createRadixSignerFromPrivateKey, createAleoSignerFromPrivateKey } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig } from './types';
import { validateWarpConfig } from './validation';
import { isEvmChain } from '../../utils/protocolUtils';

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
      walletClient: any,
      deployerPrivateKey?: string
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

          // Create signer from deployer account or wallet
          if (deployerPrivateKey) {
            logger.debug('Using deployer account for warp update', { chainName });
            const signer = await createEvmSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
          } else if (walletClient) {
            logger.debug('Using wallet client for warp update', { chainName });
            const signer = await createEvmSigner(walletClient, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
          } else {
            throw new Error('No wallet or deployer account available');
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

          let signer;
          if (deployerPrivateKey) {
            logger.debug('Using deployer account for warp update (AltVM)', { chainName, protocol: chainMetadata.protocol });

            // Create signer based on protocol
            if (chainMetadata.protocol === ProtocolType.CosmosNative) {
              signer = await createCosmosSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            } else if (chainMetadata.protocol === ProtocolType.RadixNative) {
              signer = await createRadixSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            } else if (chainMetadata.protocol === ProtocolType.AleoNative) {
              signer = await createAleoSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            } else {
              throw new Error(`Unsupported AltVM protocol for deployer accounts: ${chainMetadata.protocol}`);
            }
          } else if (walletClient) {
            logger.debug('Using wallet client for warp update (AltVM)', { chainName });
            signer = await createAltVMSigner(chainMetadata, walletClient);
          } else {
            throw new Error('No wallet or deployer account available');
          }

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
