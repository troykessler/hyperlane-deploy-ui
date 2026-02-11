import { useState, useCallback } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { AltVMDeployer } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig, WarpDeployProgress, WarpDeployResult } from './types';
import { validateWarpConfig } from './validation';

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

        const signer = await createAltVMSigner(chainMetadata, walletClient);

        setProgress({
          status: 'deploying',
          message: 'Deploying warp route contracts...',
        });

        logger.debug('Starting warp route deployment', { chainName, config });

        // Use AltVMDeployer for deploying warp routes
        const deployer = new AltVMDeployer({ [chainName]: signer });
        const addresses = await deployer.deploy({ [chainName]: config });

        logger.debug('Warp route deployment successful', { chainName, addresses });

        setProgress({
          status: 'deployed',
          message: 'Warp route deployed successfully!',
        });

        return {
          chainName,
          address: addresses[chainName],
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
