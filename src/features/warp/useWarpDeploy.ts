import { useState, useCallback } from 'react';
import { ChainName, EvmWarpModule } from '@hyperlane-xyz/sdk';
import { AltVMDeployer } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig, WarpDeployProgress, WarpDeployResult } from './types';
import { validateWarpConfig } from './validation';
import { isEvmChain } from '../../utils/protocolUtils';
import { providers } from 'ethers';

export function useWarpDeploy() {
  const [progress, setProgress] = useState<WarpDeployProgress>({
    status: 'idle',
    message: '',
  });
  const multiProvider = useMultiProvider();

  const deploy = useCallback(
    async (
      chainName: ChainName,
      config: WarpConfig,
      walletClient: any
    ): Promise<WarpDeployResult | null> => {
      try {
        setProgress({
          status: 'validating',
          message: 'Validating warp route configuration...',
        });

        // Validate config with Zod
        validateWarpConfig(config);

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        setProgress({
          status: 'validating',
          message: 'Connecting to wallet...',
        });

        setProgress({
          status: 'deploying',
          message: 'Deploying warp route contracts...',
        });

        logger.debug('Starting warp route deployment', { chainName, config });

        let addresses: any;
        let deployedAddress: string;

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
          });

          addresses = module.serialize();
          deployedAddress = addresses.deployedTokenRoute;
          logger.debug('Warp route deployment successful (EVM)', { chainName, addresses });
        } else {
          // AltVM chain: use AltVMDeployer
          const signer = await createAltVMSigner(chainMetadata, walletClient);
          const deployer = new AltVMDeployer({ [chainName]: signer });
          addresses = await deployer.deploy({ [chainName]: config });
          deployedAddress = addresses[chainName];
          logger.debug('Warp route deployment successful (AltVM)', { chainName, addresses });
        }

        setProgress({
          status: 'deployed',
          message: 'Warp route deployed successfully!',
        });

        return {
          chainName,
          address: deployedAddress,
          config,
          timestamp: Date.now(),
          txHashes: [], // TODO: Extract tx hashes from deployment
        };
      } catch (error) {
        logger.error('Warp route deployment failed', error);
        setProgress({
          status: 'failed',
          message: 'Deployment failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
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
  }, []);

  return {
    deploy,
    progress,
    reset,
    isDeploying: progress.status === 'deploying',
  };
}
