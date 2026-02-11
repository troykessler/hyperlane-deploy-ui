import { useState, useCallback } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreModule } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import { DeploymentStatus, DeployResult } from './types';

interface DeployProgress {
  status: DeploymentStatus;
  message: string;
  error?: string;
}

export function useCoreDeploy() {
  const [progress, setProgress] = useState<DeployProgress>({
    status: DeploymentStatus.Idle,
    message: '',
  });
  const multiProvider = useMultiProvider();

  const deploy = useCallback(
    async (
      chainName: ChainName,
      config: CoreConfig,
      walletClient: any
    ): Promise<DeployResult | null> => {
      try {
        setProgress({
          status: DeploymentStatus.Validating,
          message: 'Validating configuration...',
        });

        // Get chain metadata
        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        // Create chain lookup adapter
        const chainLookup = createChainLookup(multiProvider);

        // Get protocol-specific signer
        setProgress({
          status: DeploymentStatus.Validating,
          message: 'Connecting to wallet...',
        });

        const signer = await createAltVMSigner(
          chainMetadata,
          walletClient
        );

        // Deploy core contracts
        setProgress({
          status: DeploymentStatus.Deploying,
          message: 'Deploying core contracts...',
        });

        logger.debug('Starting core deployment', { chainName, config });

        const addresses = await AltVMCoreModule.deploy({
          chain: chainName,
          config,
          chainLookup,
          signer,
        });

        logger.debug('Core deployment successful', { chainName, addresses });

        setProgress({
          status: DeploymentStatus.Deployed,
          message: 'Deployment successful!',
        });

        return {
          chainName,
          addresses,
          txHashes: [], // TODO: Extract tx hashes from deployment
          timestamp: Date.now(),
        };
      } catch (error) {
        logger.error('Core deployment failed', error);
        setProgress({
          status: DeploymentStatus.Failed,
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
      status: DeploymentStatus.Idle,
      message: '',
    });
  }, []);

  return {
    deploy,
    progress,
    reset,
    isDeploying: progress.status === DeploymentStatus.Deploying,
  };
}
