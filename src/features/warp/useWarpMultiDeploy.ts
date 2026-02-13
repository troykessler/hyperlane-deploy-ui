import { useState, useCallback } from 'react';
import { ChainName, EvmWarpModule } from '@hyperlane-xyz/sdk';
import { AltVMWarpModule, AltVMDeployer } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig, MultiChainDeployStatuses, RemoteRouters } from './types';
import { validateWarpConfig } from './validation';
import { isEvmChain } from '../../utils/protocolUtils';
import { providers } from 'ethers';

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
        // Phase 1: Deploy all warp routes
        // Separate EVM and AltVM chains
        const evmChains: ChainName[] = [];
        const altVMChains: ChainName[] = [];
        const signersMap: Record<string, any> = {};

        for (const chain of chains) {
          setChainStatuses((prev) => ({ ...prev, [chain]: 'validating' }));

          try {
            validateWarpConfig(configsMap[chain]);

            const chainMetadata = multiProvider.tryGetChainMetadata(chain);
            if (!chainMetadata) {
              throw new Error(`Chain metadata not found for ${chain}`);
            }

            if (isEvmChain(chainMetadata)) {
              evmChains.push(chain);
            } else {
              altVMChains.push(chain);
              signersMap[chain] = await createAltVMSigner(chainMetadata, walletsMap[chain]);
            }
          } catch (error) {
            logger.error(`Failed to prepare for ${chain}`, error);
            setChainStatuses((prev) => ({ ...prev, [chain]: 'failed' }));
            throw error;
          }
        }

        // Deploy EVM chains
        if (evmChains.length > 0) {
          const evmMultiProvider = multiProvider.toMultiProvider();

          for (const chain of evmChains) {
            setChainStatuses((prev) => ({ ...prev, [chain]: 'deploying' }));

            try {
              // Set signer for this chain
              const walletClient = walletsMap[chain];
              if (walletClient && typeof walletClient.getSigner === 'function') {
                const signer = await walletClient.getSigner();
                evmMultiProvider.setSigner(chain, signer);
              } else if (walletClient instanceof providers.Signer) {
                evmMultiProvider.setSigner(chain, walletClient);
              }

              const module = await EvmWarpModule.create({
                chain,
                config: configsMap[chain] as any,
                multiProvider: evmMultiProvider,
              });

              const moduleAddresses = module.serialize();
              addresses[chain] = moduleAddresses.deployedTokenRoute;

              logger.debug('EVM warp route deployed', { chain, address: addresses[chain] });
              setChainStatuses((prev) => ({ ...prev, [chain]: 'deployed' }));
            } catch (error) {
              logger.error(`Failed to deploy EVM warp route on ${chain}`, error);
              setChainStatuses((prev) => ({ ...prev, [chain]: 'failed' }));
              throw error;
            }
          }
        }

        // Deploy AltVM chains
        if (altVMChains.length > 0) {
          for (const chain of altVMChains) {
            setChainStatuses((prev) => ({ ...prev, [chain]: 'deploying' }));
          }

          logger.debug('Deploying AltVM warp routes', { chains: altVMChains });

          const deployer = new AltVMDeployer(signersMap);
          const altVMConfigs = Object.fromEntries(
            altVMChains.map(chain => [chain, configsMap[chain]])
          );
          const deployedAddresses = await deployer.deploy(altVMConfigs);

          Object.assign(addresses, deployedAddresses);

          logger.debug('AltVM warp routes deployed successfully', { addresses: deployedAddresses });

          for (const chain of altVMChains) {
            setChainStatuses((prev) => ({ ...prev, [chain]: 'deployed' }));
          }
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

            if (isEvmChain(chainMetadata)) {
              // EVM chain: use EvmWarpModule
              const evmMultiProvider = multiProvider.toMultiProvider();

              // Set signer
              const walletClient = walletsMap[chain];
              if (walletClient && typeof walletClient.getSigner === 'function') {
                const signer = await walletClient.getSigner();
                evmMultiProvider.setSigner(chain, signer);
              } else if (walletClient instanceof providers.Signer) {
                evmMultiProvider.setSigner(chain, walletClient);
              }

              const module = await EvmWarpModule.create({
                chain,
                config: updatedConfig as any,
                multiProvider: evmMultiProvider,
                addresses: { deployedTokenRoute: addresses[chain] },
              });

              await module.update(updatedConfig as any);
            } else {
              // AltVM chain: use AltVMWarpModule
              const chainLookup = createChainLookup(multiProvider);
              const signer = await createAltVMSigner(chainMetadata, walletsMap[chain]);

              const module = new AltVMWarpModule(chainLookup, signer, {
                chain,
                addresses: { deployedTokenRoute: addresses[chain] },
                config: updatedConfig,
              });

              await module.update(updatedConfig);
            }

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
