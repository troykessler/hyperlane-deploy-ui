import { useState, useCallback } from 'react';
import { ChainName, EvmWarpModule } from '@hyperlane-xyz/sdk';
import { AltVMDeployer } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createAltVMSigner, createEvmSigner } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig, MultiChainDeployStatuses } from './types';
import { validateWarpConfig } from './validation';
import { isEvmChain } from '../../utils/protocolUtils';
import { initializeAltVMProtocols } from '../../utils/protocolInit';

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

      // Initialize AltVM protocols FIRST, before any SDK operations
      initializeAltVMProtocols();

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
              if (walletClient) {
                const chainMetadata = multiProvider.tryGetChainMetadata(chain);
                if (chainMetadata) {
                  const signer = await createEvmSigner(walletClient, chainMetadata);
                  evmMultiProvider.setSigner(chain, signer);
                }
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

        // Phase 2: Enroll remote routers using SDK's enrollCrossChainRouters
        logger.debug('Starting router enrollment phase', { chains });

        for (const chain of chains) {
          setChainStatuses((prev) => ({ ...prev, [chain]: 'enrolling' }));
        }

        try {
          // Build registryAddresses - this should contain core contract addresses
          // For now, use empty objects as we're providing deployed addresses separately
          const registryAddresses: Record<string, Record<string, string>> = {};
          for (const chain of chains) {
            registryAddresses[chain] = {};
          }

          // Build warpDeployConfig - only include EVM chains since AltVM handled via altVmSigners
          const warpDeployConfig: Record<string, any> = {};
          for (const chain of evmChains) {
            warpDeployConfig[chain] = configsMap[chain];
          }
          // Also add AltVM chains but mark them for altVm handling
          for (const chain of altVMChains) {
            warpDeployConfig[chain] = configsMap[chain];
          }

          // Create MultiProvider with EVM signers for enrollCrossChainRouters
          // AltVM chains will be handled via altVmSigners parameter
          const enrollmentMultiProvider = multiProvider.toMultiProvider();

          // Add all chain metadata (both EVM and AltVM)
          for (const chain of chains) {
            const chainMetadata = multiProvider.tryGetChainMetadata(chain);
            if (chainMetadata) {
              try {
                enrollmentMultiProvider.addChain(chainMetadata);
              } catch (e) {
                // Chain might already exist
              }
            }
          }

          // Set EVM signers
          for (const chain of evmChains) {
            const walletClient = walletsMap[chain];
            if (walletClient) {
              const chainMetadata = multiProvider.tryGetChainMetadata(chain);
              if (chainMetadata) {
                const signer = await createEvmSigner(walletClient, chainMetadata);
                enrollmentMultiProvider.setSigner(chain, signer);
              }
            }
          }

          logger.debug('Starting manual router enrollment', {
            chains,
            evmChains,
            altVMChains,
            deployedAddresses: addresses,
          });

          // Manually enroll routers on each chain
          // This avoids SDK protocol registration issues
          for (const sourceChain of chains) {
            logger.debug(`Enrolling routers for ${sourceChain}`);

            // Build remote routers for this chain (all other deployed chains)
            const remoteRouters: Record<number, string> = {};
            for (const targetChain of chains) {
              if (targetChain !== sourceChain) {
                const targetMetadata = multiProvider.tryGetChainMetadata(targetChain);
                if (targetMetadata?.domainId) {
                  remoteRouters[Number(targetMetadata.domainId)] = addresses[targetChain];
                }
              }
            }

            logger.debug(`Enrolling ${Object.keys(remoteRouters).length} remote routers on ${sourceChain}`, {
              remoteRouters,
            });

            const sourceMetadata = multiProvider.tryGetChainMetadata(sourceChain);
            if (!sourceMetadata) {
              throw new Error(`No metadata for ${sourceChain}`);
            }

            if (isEvmChain(sourceMetadata)) {
              // EVM chain: Call contract methods directly
              const signer = enrollmentMultiProvider.getSigner(sourceChain);
              const tokenAddress = addresses[sourceChain];

              // Get the contract instance
              const { Contract } = await import('ethers');
              const tokenRouterAbi = [
                'function enrollRemoteRouter(uint32 _domain, bytes32 _router) external',
                'function setDestinationGas(uint32 _destination, uint256 _gas) external',
              ];
              const contract = new Contract(tokenAddress, tokenRouterAbi, signer);

              // Enroll each remote router and set destination gas
              for (const [domainId, routerAddress] of Object.entries(remoteRouters)) {
                const domain = Number(domainId);

                // Convert address to bytes32
                // For EVM addresses, pad with zeros on the left
                const bytes32Router = routerAddress.toLowerCase().replace('0x', '').padStart(64, '0');
                const routerBytes32 = '0x' + bytes32Router;

                logger.debug(`Enrolling remote router on ${sourceChain}`, {
                  domain,
                  router: routerAddress,
                  routerBytes32,
                });

                // Enroll the remote router
                const enrollTx = await contract.enrollRemoteRouter(domain, routerBytes32);
                await enrollTx.wait();
                logger.debug(`Router enrolled on ${sourceChain}`, {
                  domain,
                  txHash: enrollTx.hash,
                });

                // Set destination gas
                logger.debug(`Setting destination gas on ${sourceChain}`, { domain, gas: '200000' });
                const gasTx = await contract.setDestinationGas(domain, '200000');
                await gasTx.wait();
                logger.debug(`Destination gas set on ${sourceChain}`, {
                  domain,
                  txHash: gasTx.hash,
                });
              }
            } else {
              // AltVM chain: Call enrollRemoteRouter via signer
              const signer = signersMap[sourceChain];
              if (!signer) {
                throw new Error(`No signer for ${sourceChain}`);
              }

              // Enroll each remote router
              for (const [domainId, routerAddress] of Object.entries(remoteRouters)) {
                logger.debug(`Enrolling remote router ${routerAddress} (domain ${domainId}) on ${sourceChain}`);

                await signer.enrollRemoteRouter({
                  tokenAddress: addresses[sourceChain],
                  remoteRouter: {
                    receiverDomainId: Number(domainId),
                    receiverAddress: routerAddress,
                    gas: '200000', // Default gas for remote execution
                  },
                });
              }
            }

            logger.debug(`Router enrollment complete for ${sourceChain}`);
          }

          logger.debug('Router enrollment completed successfully');

          // Mark all chains as complete
          for (const chain of chains) {
            setChainStatuses((prev) => ({ ...prev, [chain]: 'complete' }));
          }
        } catch (error) {
          logger.error('Router enrollment failed', error);
          // Mark all chains as failed
          for (const chain of chains) {
            setChainStatuses((prev) => ({ ...prev, [chain]: 'failed' }));
          }
          throw new Error(
            `Router enrollment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
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
