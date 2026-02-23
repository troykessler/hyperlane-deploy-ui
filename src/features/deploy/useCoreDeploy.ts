import { useState, useCallback } from 'react';
import { ChainName, EvmCoreModule } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreModule } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner, createEvmSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import { DeploymentStatus, DeployResult } from './types';
import { isEvmChain } from '../../utils/protocolUtils';
import { checksumAddresses } from '../../utils/addressUtils';

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

        // Get protocol-specific signer
        setProgress({
          status: DeploymentStatus.Validating,
          message: 'Connecting to wallet...',
        });

        // Deploy core contracts
        setProgress({
          status: DeploymentStatus.Deploying,
          message: 'Deploying core contracts...',
        });

        logger.debug('Starting core deployment', { chainName, config });

        // Checksum all addresses in config to ensure proper EIP-55 format
        const checksummedConfig = checksumAddresses(config);

        let addresses: any;

        if (isEvmChain(chainMetadata)) {
          // EVM chain: use EvmCoreModule
          const evmMultiProvider = multiProvider.toMultiProvider();

          // Convert wallet client (viem) to ethers signer
          if (walletClient) {
            const signer = await createEvmSigner(walletClient, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
          }

          const coreModule = await EvmCoreModule.create({
            chain: chainName,
            config: checksummedConfig,
            multiProvider: evmMultiProvider,
          });

          addresses = coreModule.serialize();
          logger.debug('Core deployment successful (EVM)', { chainName, addresses });
        } else {
          // AltVM chain: use AltVMCoreModule
          const chainLookup = createChainLookup(multiProvider);
          const signer = await createAltVMSigner(chainMetadata, walletClient);

          addresses = await AltVMCoreModule.deploy({
            chain: chainName,
            config: checksummedConfig,
            chainLookup,
            signer,
          });

          logger.debug('Core deployment successful (AltVM)', { chainName, addresses });
        }

        setProgress({
          status: DeploymentStatus.Deployed,
          message: 'Deployment successful!',
        });

        // Checksum all addresses to ensure proper EIP-55 format
        const checksummedAddresses = checksumAddresses(addresses);

        return {
          chainName,
          addresses: checksummedAddresses,
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
