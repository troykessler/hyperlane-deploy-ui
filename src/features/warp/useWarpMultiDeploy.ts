import { useState, useCallback } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { AltVMWarpModule, AltVMDeployer } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig, MultiChainDeployStatuses, RemoteRouters } from './types';
import { validateWarpConfig } from './validation';

/**
 * Hook for deploying warp routes across multiple chains
 * Handles sequential deployment and automatic remote router enrollment
 */
export function useWarpMultiDeploy() {
  const [chainStatuses, setChainStatuses] = useState<MultiChainDeployStatuses>({});
  const [deployedAddresses, setDeployedAddresses] = useState<Record<ChainName, string>>({});
  const multiProvider = useMultiProvider();

  const deploy = useCallback(
    async (
      configsMap: Record<ChainName, WarpConfig>,
      walletsMap: Record<ChainName, any>
    ): Promise<Record<ChainName, string> | null> => {
      const chains = Object.keys(configsMap) as ChainName[];

      if (chains.length === 0) {
        logger.error('No chains provided for multi-chain deployment', new Error('No chains'));
        return null;
      }

      logger.debug('Starting multi-chain warp deployment', {
        chains,
        chainCount: chains.length,
      });

      const addresses: Record<ChainName, string> = {};

      try {
        // Phase 1: Deploy all warp routes using AltVMDeployer
        // Build signers map
        const signersMap: Record<string, any> = {};

        for (const chain of chains) {
          setChainStatuses((prev) => ({ ...prev, [chain]: 'validating' }));

          try {
            validateWarpConfig(configsMap[chain]);

            const chainMetadata = multiProvider.tryGetChainMetadata(chain);
            if (!chainMetadata) {
              throw new Error(`Chain metadata not found for ${chain}`);
            }

            signersMap[chain] = await createAltVMSigner(chainMetadata, walletsMap[chain]);
          } catch (error) {
            logger.error(`Failed to prepare signer for ${chain}`, error);
            setChainStatuses((prev) => ({ ...prev, [chain]: 'failed' }));
            throw error;
          }
        }

        // Deploy all chains at once
        for (const chain of chains) {
          setChainStatuses((prev) => ({ ...prev, [chain]: 'deploying' }));
        }

        logger.debug('Deploying warp routes across all chains', { chains });

        const deployer = new AltVMDeployer(signersMap);
        const deployedAddresses = await deployer.deploy(configsMap);

        Object.assign(addresses, deployedAddresses);

        logger.debug('Warp routes deployed successfully', { addresses });

        for (const chain of chains) {
          setChainStatuses((prev) => ({ ...prev, [chain]: 'deployed' }));
        }

        // Update deployed addresses state
        setDeployedAddresses(addresses);

        // Phase 2: Enroll remote routers on all chains
        for (const chain of chains) {
          setChainStatuses((prev) => ({ ...prev, [chain]: 'enrolling' }));

          try {
            // Build remote routers map (all other chains)
            const remoteRouters: RemoteRouters = {};
            chains.forEach((otherChain) => {
              if (otherChain !== chain) {
                remoteRouters[otherChain] = { address: addresses[otherChain] };
              }
            });

            // Update config with remote routers
            const updatedConfig: WarpConfig = {
              ...configsMap[chain],
              remoteRouters,
            };

            logger.debug('Enrolling remote routers', {
              chain,
              remoteRouters: Object.keys(remoteRouters),
            });

            const chainMetadata = multiProvider.tryGetChainMetadata(chain);
            if (!chainMetadata) {
              throw new Error(`Chain metadata not found for ${chain}`);
            }

            const chainLookup = createChainLookup(multiProvider);
            const signer = await createAltVMSigner(chainMetadata, walletsMap[chain]);

            // Create module instance for the deployed warp route
            const module = new AltVMWarpModule(chainLookup, signer, {
              chain,
              addresses: { deployedTokenRoute: addresses[chain] },
              config: updatedConfig,
            });

            // Apply router enrollment
            await module.update(updatedConfig);

            logger.debug('Remote routers enrolled successfully', { chain });

            setChainStatuses((prev) => ({ ...prev, [chain]: 'complete' }));
          } catch (error) {
            logger.error(`Failed to enroll remote routers on ${chain}`, error);
            setChainStatuses((prev) => ({ ...prev, [chain]: 'failed' }));
            throw new Error(
              `Router enrollment failed on ${chain}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }

        logger.debug('Multi-chain warp deployment complete', {
          chains,
          addresses,
        });

        return addresses;
      } catch (error) {
        logger.error('Multi-chain deployment failed', error);
        return null;
      }
    },
    [multiProvider]
  );

  const reset = useCallback(() => {
    setChainStatuses({});
    setDeployedAddresses({});
  }, []);

  return {
    deploy,
    chainStatuses,
    deployedAddresses,
    reset,
    isDeploying: Object.values(chainStatuses).some(
      (status) =>
        status === 'validating' || status === 'deploying' || status === 'enrolling'
    ),
  };
}
