import { useState, useCallback } from 'react';
import { ChainName, EvmWarpModule } from '@hyperlane-xyz/sdk';
import { AltVMDeployer } from '@hyperlane-xyz/deploy-sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useMultiProvider } from '../chains/hooks';
import {
  createAltVMSigner,
  createEvmSigner,
  createEvmSignerFromPrivateKey,
  createCosmosSignerFromPrivateKey,
  createRadixSignerFromPrivateKey,
  createAleoSignerFromPrivateKey
} from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig, WarpDeployProgress, WarpDeployResult } from './types';
import { validateWarpConfig } from './validation';
import { isEvmChain } from '../../utils/protocolUtils';

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
      walletClient: any,
      deployerPrivateKey?: string
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

          // Create signer from private key or wallet client
          if (deployerPrivateKey) {
            const signer = await createEvmSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
            logger.debug('Using deployer account signer for warp deployment');
          } else if (walletClient) {
            const signer = await createEvmSigner(walletClient, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
            logger.debug('Using connected wallet signer for warp deployment');
          } else {
            throw new Error('No signer available - connect wallet or select deployer account');
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
          // Create signer from private key or wallet client
          let signer;
          if (deployerPrivateKey) {
            // Use deployer account
            switch (chainMetadata.protocol) {
              case ProtocolType.CosmosNative:
                signer = await createCosmosSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Cosmos deployer account signer for warp deployment');
                break;
              case ProtocolType.Radix:
                signer = await createRadixSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Radix deployer account signer for warp deployment');
                break;
              case ProtocolType.Aleo:
                signer = await createAleoSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Aleo deployer account signer for warp deployment');
                break;
              default:
                throw new Error(`Deployer accounts not yet supported for ${chainMetadata.protocol}`);
            }
          } else if (walletClient) {
            // Use connected wallet
            signer = await createAltVMSigner(chainMetadata, walletClient);
            logger.debug('Using connected wallet signer for warp deployment');
          } else {
            throw new Error('No signer available - connect wallet or select deployer account');
          }

          const deployer = new AltVMDeployer({ [chainName]: signer });
          addresses = await deployer.deploy({ [chainName]: config });
          deployedAddress = addresses[chainName];
          logger.debug('Warp route deployment successful (AltVM)', { chainName, addresses });
        }

        setProgress({
          status: 'deployed',
          message: 'Warp route deployed successfully! View your deployment results in the View Deployments page.',
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
