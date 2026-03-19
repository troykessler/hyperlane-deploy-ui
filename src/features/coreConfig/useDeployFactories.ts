import { useCallback } from 'react';
import { ChainName, EvmCoreModule, MultiProvider, ProxyFactoryFactoriesAddresses } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { logger } from '../../utils/logger';

const FACTORY_CACHE_PREFIX = 'hyperlane_factories_';

/**
 * Hook for deploying and caching factory contracts
 * Strategy: Check registry → Check localStorage → Deploy → Cache
 */
export function useDeployFactories() {
  const deployFactories = useCallback(
    async (
      chainName: ChainName,
      evmMultiProvider: MultiProvider
    ): Promise<ProxyFactoryFactoriesAddresses> => {
      // TODO: Check registry for factory addresses when SDK provides a method
      // For now, we rely on localStorage cache and deployment

      // Check localStorage cache
      const cacheKey = `${FACTORY_CACHE_PREFIX}${chainName}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const factories = JSON.parse(cached) as ProxyFactoryFactoriesAddresses;
          logger.debug('Using cached factory addresses', { chainName, factories });
          return factories;
        } catch (err) {
          logger.warn('Failed to parse cached factories, will deploy new ones', { chainName, err });
        }
      }

      // Deploy factory contracts
      logger.debug('Deploying factory contracts', { chainName });

      // Create minimal config for factory deployment
      const ownerAddress = await evmMultiProvider.getSignerAddress(chainName);
      const minimalConfig: CoreConfig = {
        owner: ownerAddress,
        defaultIsm: { type: 'testIsm' },
        defaultHook: { type: 'merkleTreeHook' },
        requiredHook: { type: 'merkleTreeHook' },
      };

      const factories = await EvmCoreModule.deployIsmFactories({
        chainName,
        config: minimalConfig,
        multiProvider: evmMultiProvider,
      });

      // Cache the deployed factory addresses
      localStorage.setItem(cacheKey, JSON.stringify(factories));
      logger.debug('Deployed and cached factory addresses', { chainName, factories });

      return factories;
    },
    []
  );

  return { deployFactories };
}
