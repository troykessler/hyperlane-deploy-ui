import { useState, useCallback } from 'react';
import { ChainName, EvmCoreModule } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreModule } from '@hyperlane-xyz/deploy-sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import {
  createAltVMSigner,
  createEvmSigner,
  createEvmSignerFromPrivateKey,
  createCosmosSignerFromPrivateKey,
  createRadixSignerFromPrivateKey,
  createAleoSignerFromPrivateKey
} from '../../utils/signerAdapters';
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
      walletClient: any,
      deployerPrivateKey?: string
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

          // Create signer from private key or wallet client
          if (deployerPrivateKey) {
            const signer = await createEvmSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
            logger.debug('Using deployer account signer for EVM deployment');
          } else if (walletClient) {
            const signer = await createEvmSigner(walletClient, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
            logger.debug('Using connected wallet signer for EVM deployment');
          } else {
            throw new Error('No signer available - connect wallet or select deployer account');
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

          // Create signer from private key or wallet client
          let signer;
          if (deployerPrivateKey) {
            // Use deployer account
            switch (chainMetadata.protocol) {
              case ProtocolType.CosmosNative:
                signer = await createCosmosSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Cosmos deployer account signer for deployment');
                break;
              case ProtocolType.Radix:
                signer = await createRadixSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Radix deployer account signer for deployment');
                break;
              case ProtocolType.Aleo:
                signer = await createAleoSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Aleo deployer account signer for deployment');
                break;
              default:
                throw new Error(`Deployer accounts not yet supported for ${chainMetadata.protocol}`);
            }
          } else if (walletClient) {
            // Use connected wallet
            signer = await createAltVMSigner(chainMetadata, walletClient);
            logger.debug('Using connected wallet signer for deployment');
          } else {
            throw new Error('No signer available - connect wallet or select deployer account');
          }

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
          message: 'Deployment successful! View your deployment results in the View Deployments page.',
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
